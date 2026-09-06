package com.sih.landslide.repository;

import com.sih.landslide.entity.FieldReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FieldReportRepository extends JpaRepository<FieldReportEntity, String> {
    List<FieldReportEntity> findAllByOrderByTimestampDesc();
    Optional<FieldReportEntity> findByIdempotencyHash(String idempotencyHash);
}
