package com.manoj.quoter;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_log", indexes = {
    @Index(name = "idx_audit_client", columnList = "client_id"),
    @Index(name = "idx_audit_ts",     columnList = "created_at"),
    @Index(name = "idx_audit_action", columnList = "action"),
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false, length = 64)
    private String clientId;

    @Column(nullable = false, length = 32)
    private String action;

    @Column(length = 16)
    private String symbol;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(length = 512)
    private String detail;

    public AuditLog() {}

    public AuditLog(String clientId, String action, String symbol,
                    String ipAddress, String detail) {
        this.clientId  = clientId;
        this.action    = action;
        this.symbol    = symbol;
        this.ipAddress = ipAddress;
        this.detail    = detail;
    }

    public Long    getId()        { return id; }
    public String  getClientId()  { return clientId; }
    public String  getAction()    { return action; }
    public String  getSymbol()    { return symbol; }
    public String  getIpAddress() { return ipAddress; }
    public Instant getCreatedAt() { return createdAt; }
    public String  getDetail()    { return detail; }
}
