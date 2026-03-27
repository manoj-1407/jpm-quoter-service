package com.manoj.quoter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            if (jwtUtil.isValid(token)) {
                String clientId = jwtUtil.extractClientId(token);
                String role     = jwtUtil.extractRole(token);
                var authority   = new SimpleGrantedAuthority("ROLE_" + role.toUpperCase());
                var auth = new UsernamePasswordAuthenticationToken(
                        clientId, null, List.of(authority));
                SecurityContextHolder.getContext().setAuthentication(auth);
                request.setAttribute("clientId", clientId);
                request.setAttribute("role", role);
            }
        }
        chain.doFilter(request, response);
    }
}
