package com.unitrack.service;

import com.unitrack.dto.QueueDTO;
import com.unitrack.model.QueueStatus;
import com.unitrack.repository.QueueStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class QueueService {

    private final QueueStatusRepository queueStatusRepository;

    public QueueStatus updateQueueStatus(QueueDTO dto) {
        QueueStatus status = queueStatusRepository.findById(1L).orElse(new QueueStatus());
        status.setId(1L);
        status.setLevel(dto.getLevel().toUpperCase());
        status.setUpdatedAt(LocalDateTime.now());
        return queueStatusRepository.save(status);
    }

    public Optional<QueueStatus> getQueueStatus() {
        return queueStatusRepository.findById(1L);
    }
}
