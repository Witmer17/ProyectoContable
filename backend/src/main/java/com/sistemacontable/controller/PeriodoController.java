package com.sistemacontable.controller;

import com.sistemacontable.entity.Periodo;
import com.sistemacontable.service.PeriodoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/periodos")
public class PeriodoController {

    private final PeriodoService periodoService;

    public PeriodoController(PeriodoService periodoService) {
        this.periodoService = periodoService;
    }

    @GetMapping
    public ResponseEntity<List<Periodo>> listar(@RequestParam(required = false, defaultValue = "2026") Integer anio) {
        return ResponseEntity.ok(periodoService.listarPorAnio(anio));
    }

    @PostMapping("/{anio}/{mes}/cerrar")
    public ResponseEntity<Periodo> cerrar(
            @PathVariable Integer anio,
            @PathVariable Integer mes,
            @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : "Cierre de período";
        return ResponseEntity.ok(periodoService.cerrar(anio, mes, motivo));
    }
}
