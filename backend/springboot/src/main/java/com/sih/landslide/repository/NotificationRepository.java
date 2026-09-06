package com.sih.landslide.repository;

import com.sih.landslide.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, String> {
    
    Optional<NotificationEntity> findByAlertIdAndRecipientAndChannelAndRequestedAtAfter(
            String alertId, String recipient, String channel, Instant cutoff);

    List<NotificationEntity> findAllByOrderByRequestedAtDesc();
}
