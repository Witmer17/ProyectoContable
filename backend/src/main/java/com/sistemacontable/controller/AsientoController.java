package com.sistemacontable.controller;

import com.sistemacontable.dto.ActualizarAsientoDto;
import com.sistemacontable.dto.AnularAsientoDto;
import com.sistemacontable.dto.AsientoDto;
import com.sistemacontable.service.AsientoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/asientos")
public class AsientoController {

    private final AsientoService asientoService;

    public AsientoController(AsientoService asientoService) {
        this.asientoService = asientoService;
    }

    @GetMapping
    public ResponseEntity<List<AsientoDto>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) String operacion) {
        return ResponseEntity.ok(asientoService.listar(desde, hasta, operacion));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AsientoDto> obtener(@PathVariable Integer id) {
        return ResponseEntity.ok(asientoService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<AsientoDto> crear(
            @RequestBody ActualizarAsientoDto dto,
            Authentication authentication) {
        Integer usuarioId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Integer) {
            usuarioId = (Integer) authentication.getPrincipal();
        }
        return ResponseEntity.ok(asientoService.crear(dto, usuarioId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<AsientoDto> actualizar(
            @PathVariable Integer id,
            @RequestBody ActualizarAsientoDto dto,
            Authentication authentication) {
        Integer usuarioId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Integer) {
            usuarioId = (Integer) authentication.getPrincipal();
        }
        return ResponseEntity.ok(asientoService.actualizar(id, dto, usuarioId));
    }

    @PostMapping("/{id}/anular")
    public ResponseEntity<AsientoDto> anular(
            @PathVariable Integer id,
            @RequestBody(required = false) AnularAsientoDto dto,
            Authentication authentication) {
        Integer usuarioId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Integer) {
            usuarioId = (Integer) authentication.getPrincipal();
        }
        String motivo = dto != null ? dto.getMotivo() : "Anulado";
        return ResponseEntity.ok(asientoService.anular(id, motivo, usuarioId));
    }
}
