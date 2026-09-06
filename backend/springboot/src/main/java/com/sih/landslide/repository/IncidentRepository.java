package com.sih.landslide.repository;

import com.sih.landslide.entity.IncidentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<IncidentEntity, String> {
    Optional<IncidentEntity> findByGridId(String gridId);
}
