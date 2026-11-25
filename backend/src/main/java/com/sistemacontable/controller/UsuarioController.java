package com.sistemacontable.controller;

import com.sistemacontable.dto.AuthResponse;
import com.sistemacontable.entity.Usuario;
import com.sistemacontable.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;

    public UsuarioController(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuthResponse.UsuarioDto>> listar() {
        List<AuthResponse.UsuarioDto> dtos = usuarioRepository.findAll().stream()
                .map(u -> new AuthResponse.UsuarioDto(u.getId(), u.getEmail(), u.getNombre(), u.getRol()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
}
