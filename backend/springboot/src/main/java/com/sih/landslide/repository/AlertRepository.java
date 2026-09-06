package com.sih.landslide.repository;

import com.sih.landslide.entity.AlertEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<AlertEntity, String> {
    List<AlertEntity> findAllByOrderByTimestampDesc();
    Optional<AlertEntity> findByIdempotencyHash(String idempotencyHash);
}
