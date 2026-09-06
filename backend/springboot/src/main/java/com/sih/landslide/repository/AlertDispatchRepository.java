package com.sih.landslide.repository;

import com.sih.landslide.entity.AlertDispatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertDispatchRepository extends JpaRepository<AlertDispatchEntity, String> {
    List<AlertDispatchEntity> findAllByOrderByTimestampDesc();
}
