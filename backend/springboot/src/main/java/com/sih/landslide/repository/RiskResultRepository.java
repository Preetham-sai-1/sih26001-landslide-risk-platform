package com.sih.landslide.repository;

import com.sih.landslide.entity.RiskResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RiskResultRepository extends JpaRepository<RiskResultEntity, String> {
    Optional<RiskResultEntity> findByIdempotencyHash(String idempotencyHash);
}
