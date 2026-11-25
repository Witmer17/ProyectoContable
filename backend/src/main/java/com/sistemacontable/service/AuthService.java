package com.sistemacontable.service;

import com.sistemacontable.dto.AuthResponse;
import com.sistemacontable.dto.LoginRequest;
import com.sistemacontable.entity.Usuario;
import com.sistemacontable.repository.UsuarioRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UsuarioRepository usuarioRepository, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    public AuthResponse login(LoginRequest request) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(request.getEmail());
        if (usuarioOpt.isEmpty()) {
            throw new RuntimeException("Credenciales inválidas");
        }

        Usuario usuario = usuarioOpt.get();
        if (!usuario.getActivo()) {
            throw new RuntimeException("Usuario inactivo");
        }

        // Si la clave coincide con bcrypt o directa
        boolean matches = passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())
                || request.getPassword().equals(usuario.getPasswordHash());

        if (!matches) {
            throw new RuntimeException("Credenciales inválidas");
        }

        String token = jwtService.generateToken(usuario.getId(), usuario.getEmail(), usuario.getRol().name());
        AuthResponse.UsuarioDto uDto = new AuthResponse.UsuarioDto(
                usuario.getId(),
                usuario.getEmail(),
                usuario.getNombre(),
                usuario.getRol()
        );

        return new AuthResponse(token, uDto);
    }
}
