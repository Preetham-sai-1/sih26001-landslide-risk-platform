package com.sih.landslide.repository;

import com.sih.landslide.entity.SyncRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SyncRecordRepository extends JpaRepository<SyncRecordEntity, String> {
    Optional<SyncRecordEntity> findByIdempotencyHash(String idempotencyHash);
}
