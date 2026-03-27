package com.manoj.quoter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    @Async
    public void record(String clientId, String action, String symbol,
                       String ip, String detail) {
        try {
            repo.save(new AuditLog(clientId, action, symbol, ip, detail));
        } catch (Exception e) {
            log.warn("Audit write failed action={} client={} err={}",
                action, clientId, e.getMessage());
        }
    }
}
