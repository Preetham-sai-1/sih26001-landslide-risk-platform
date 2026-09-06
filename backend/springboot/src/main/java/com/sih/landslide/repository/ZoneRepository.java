package com.sih.landslide.repository;

import com.sih.landslide.entity.ZoneEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ZoneRepository extends JpaRepository<ZoneEntity, String> {

    List<ZoneEntity> findByStateIgnoreCase(String state);

    List<ZoneEntity> findByRiskLevelIgnoreCase(String riskLevel);

    @Query(value = """
        SELECT *, (
            6371 * acos(
                cos(radians(:lat)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(:lon)) +
                sin(radians(:lat)) * sin(radians(latitude))
            )
        ) AS distance_km
        FROM zones
        ORDER BY distance_km ASC
        LIMIT 1
        """, nativeQuery = true)
    Optional<ZoneEntity> findNearestZone(@Param("lat") Double lat, @Param("lon") Double lon);

    @Query(value = """
        SELECT *
        FROM zones
        WHERE (
            6371 * acos(
                cos(radians(:lat)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(:lon)) +
                sin(radians(:lat)) * sin(radians(latitude))
            )
        ) <= :maxDistKm
        ORDER BY latitude, longitude
        """, nativeQuery = true)
    List<ZoneEntity> findNearbyZones(@Param("lat") Double lat, @Param("lon") Double lon, @Param("maxDistKm") Double maxDistKm);
}
