package com.sistemacontable.controller;

import com.sistemacontable.service.ReporteService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/reportes")
public class ReporteController {

    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    @GetMapping("/registro-compras")
    public ResponseEntity<Map<String, Object>> registroCompras(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(reporteService.registroCompras(desde, hasta));
    }

    @GetMapping("/registro-ventas")
    public ResponseEntity<Map<String, Object>> registroVentas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(reporteService.registroVentas(desde, hasta));
    }

    @GetMapping("/pendientes/{tipo}")
    public ResponseEntity<Map<String, Object>> pendientes(@PathVariable String tipo) {
        return ResponseEntity.ok(reporteService.pendientes(tipo));
    }

    @GetMapping("/balance-comprobacion")
    public ResponseEntity<Map<String, Object>> balanceComprobacion() {
        return ResponseEntity.ok(reporteService.balanceComprobacion());
    }

    @GetMapping("/estado-resultados")
    public ResponseEntity<Map<String, Object>> estadoResultados() {
        return ResponseEntity.ok(reporteService.estadoResultados());
    }
}
