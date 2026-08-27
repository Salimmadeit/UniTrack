package com.unitrack.repository;

import com.unitrack.model.QueueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QueueStatusRepository extends JpaRepository<QueueStatus, Long> {
}
