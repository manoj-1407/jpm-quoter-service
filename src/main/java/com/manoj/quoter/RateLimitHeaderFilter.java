package com.manoj.quoter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class RateLimitHeaderFilter extends OncePerRequestFilter {

    private final RedisRateLimiterService rateLimiter;

    public RateLimitHeaderFilter(RedisRateLimiterService rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        String ip = req.getRemoteAddr();
        if (!rateLimiter.isAllowed(ip)) {
            res.setStatus(429);
            res.setContentType("application/json");
            res.getWriter().write("{\"error\":\"RATE_LIMITED\",\"message\":\"Too many requests\"}");
            return;
        }
        res.setHeader("X-RateLimit-Limit", "60");
        res.setHeader("X-RateLimit-Remaining", String.valueOf(rateLimiter.getRemaining(ip)));
        chain.doFilter(req, res);
    }
}
