package com.manoj.quoter;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/audit")
public class AuditController {

    private final AuditLogRepository repo;

    public AuditController(AuditLogRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditLog>> list(
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "50") int size,
        @RequestParam(required = false)    String clientId,
        @RequestParam(required = false)    String action
    ) {
        int safeSize = Math.min(size, 200);
        PageRequest pr = PageRequest.of(page, safeSize,
                Sort.by("createdAt").descending());

        if (clientId != null && !clientId.isBlank())
            return ResponseEntity.ok(repo.findByClientIdOrderByCreatedAtDesc(clientId, pr));
        if (action != null && !action.isBlank())
            return ResponseEntity.ok(repo.findByActionOrderByCreatedAtDesc(action, pr));
        return ResponseEntity.ok(repo.findAll(pr));
    }
}
