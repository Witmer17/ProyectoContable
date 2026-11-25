package com.sistemacontable.config;

import com.sistemacontable.service.JwtService;
import io.jsonwebtoken.Claims;
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
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtService.validateToken(token)) {
                Claims claims = jwtService.parseToken(token);
                String subStr = claims.getSubject();
                Integer userId = subStr != null ? Integer.valueOf(subStr) : claims.get("userId", Integer.class);
                String email = claims.get("email", String.class);
                String rol = claims.get("rol", String.class);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userId != null ? userId : email,
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + (rol != null ? rol : "ADMINISTRADOR")))
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        // Si no hay token provisto, establecer usuario 1 (Administrador) por defecto
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            UsernamePasswordAuthenticationToken defaultAuth = new UsernamePasswordAuthenticationToken(
                    1,
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))
            );
            SecurityContextHolder.getContext().setAuthentication(defaultAuth);
        }

        filterChain.doFilter(request, response);
    }
}
