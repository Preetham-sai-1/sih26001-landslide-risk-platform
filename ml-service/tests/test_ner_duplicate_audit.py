"""
ml-service/tests/test_ner_duplicate_audit.py

Uses small SYNTHETIC records mirroring the real audit's discovered
patterns (distinct-events-same-coordinate, non-unique SLIDE_NO), not
the real 8,546-record file (validated separately, see
docs/ner_crs_duplicate_audit.md for real results).
"""

import geopandas as gpd
from shapely.geometry import Point

from src.data.ner_duplicate_audit import audit_duplicates, assign_canonical_event_id


def _make_gdf(rows):
    return gpd.GeoDataFrame(
        {
            "OBJECTID": [r["oid"] for r in rows],
            "SLIDE_NO": [r["slide_no"] for r in rows],
            "STATE": [r.get("state", "Assam") for r in rows],
            "TRIGGERING": [r.get("trig", "Rainfall") for r in rows],
        },
        geometry=[Point(r["x"], r["y"]) for r in rows],
        crs="EPSG:4326",
    )


def test_duplicate_coordinates_with_different_ids_flagged_as_distinct_events():
    gdf = _make_gdf([
        {"oid": 1, "slide_no": "A1", "x": 90.0, "y": 25.0},
        {"oid": 2, "slide_no": "A2", "x": 90.0, "y": 25.0},  # same coord, different ID
        {"oid": 3, "slide_no": "A3", "x": 91.0, "y": 26.0},
    ])
    result = audit_duplicates(gdf)
    assert result.n_duplicate_coordinate_records == 2
    assert result.n_duplicate_coordinate_groups == 1
    assert result.n_groups_different_slide_no == 1
    assert result.n_groups_same_slide_no == 0


def test_fully_identical_rows_are_detected_separately():
    gdf = _make_gdf([
        {"oid": 1, "slide_no": "B1", "x": 90.0, "y": 25.0, "trig": "Rainfall"},
        {"oid": 2, "slide_no": "B1", "x": 90.0, "y": 25.0, "trig": "Rainfall"},  # identical attrs
    ])
    result = audit_duplicates(gdf)
    assert result.n_groups_fully_identical_rows == 1
    assert result.n_groups_same_slide_no == 1


def test_duplicate_slide_no_with_different_coordinates_is_flagged_not_resolved():
    gdf = _make_gdf([
        {"oid": 1, "slide_no": "C1", "x": 90.0, "y": 25.0, "trig": "Rainfall"},
        {"oid": 2, "slide_no": "C1", "x": 92.0, "y": 27.0, "trig": "Earthquake"},  # same ID, different location AND attrs
    ])
    result = audit_duplicates(gdf)
    assert result.n_duplicate_slide_no_records == 2
    detail = result.duplicate_slide_no_detail[0]
    assert detail["same_coordinates"] is False
    assert detail["fully_identical_rows"] is False


def test_no_duplicates_returns_zero_counts():
    gdf = _make_gdf([
        {"oid": 1, "slide_no": "D1", "x": 90.0, "y": 25.0},
        {"oid": 2, "slide_no": "D2", "x": 91.0, "y": 26.0},
    ])
    result = audit_duplicates(gdf)
    assert result.n_duplicate_coordinate_records == 0
    assert result.n_duplicate_slide_no_records == 0


def test_assign_canonical_event_id_uses_unique_objectid():
    gdf = _make_gdf([
        {"oid": 1, "slide_no": "E1", "x": 90.0, "y": 25.0},
        {"oid": 2, "slide_no": "E1", "x": 91.0, "y": 26.0},  # SLIDE_NO not unique
    ])
    ids = assign_canonical_event_id(gdf)
    assert ids.is_unique
    assert list(ids) == [1, 2]


def test_assign_canonical_event_id_raises_if_primary_key_not_unique():
    gdf = _make_gdf([
        {"oid": 1, "slide_no": "F1", "x": 90.0, "y": 25.0},
        {"oid": 1, "slide_no": "F2", "x": 91.0, "y": 26.0},  # duplicated OBJECTID
    ])
    try:
        assign_canonical_event_id(gdf)
        assert False, "expected ValueError"
    except ValueError:
        pass
