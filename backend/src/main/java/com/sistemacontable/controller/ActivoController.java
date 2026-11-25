package com.sistemacontable.controller;

import com.sistemacontable.entity.ActivoFijo;
import com.sistemacontable.service.ActivoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/activos")
public class ActivoController {

    private final ActivoService activoService;

    public ActivoController(ActivoService activoService) {
        this.activoService = activoService;
    }

    @GetMapping
    public ResponseEntity<List<ActivoFijo>> listar() {
        return ResponseEntity.ok(activoService.listar());
    }

    @PostMapping
    public ResponseEntity<ActivoFijo> crear(@RequestBody ActivoFijo activo) {
        return ResponseEntity.ok(activoService.guardar(activo));
    }
}
