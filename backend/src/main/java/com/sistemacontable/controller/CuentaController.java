package com.sistemacontable.controller;

import com.sistemacontable.dto.ActualizarCuentaDto;
import com.sistemacontable.dto.CrearCuentaDto;
import com.sistemacontable.dto.CuentaDto;
import com.sistemacontable.service.CuentaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/cuentas")
public class CuentaController {

    private final CuentaService cuentaService;

    public CuentaController(CuentaService cuentaService) {
        this.cuentaService = cuentaService;
    }

    @GetMapping
    public ResponseEntity<List<CuentaDto>> listar(
            @RequestParam(required = false) Integer elemento,
            @RequestParam(required = false) String grupo,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(cuentaService.listar(elemento, grupo, q));
    }

    @GetMapping("/{codigo}")
    public ResponseEntity<CuentaDto> obtener(@PathVariable String codigo) {
        return ResponseEntity.ok(cuentaService.obtener(codigo));
    }

    @PostMapping
    public ResponseEntity<CuentaDto> crear(@RequestBody CrearCuentaDto dto) {
        return ResponseEntity.ok(cuentaService.crear(dto));
    }

    @PatchMapping("/{codigo}")
    public ResponseEntity<CuentaDto> actualizar(@PathVariable String codigo, @RequestBody ActualizarCuentaDto dto) {
        return ResponseEntity.ok(cuentaService.actualizar(codigo, dto));
    }
}
