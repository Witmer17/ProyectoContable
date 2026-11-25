package com.sistemacontable.controller;

import com.sistemacontable.dto.CrearTerceroDto;
import com.sistemacontable.dto.TerceroDto;
import com.sistemacontable.entity.enums.TipoTercero;
import com.sistemacontable.service.ApisPeruService;
import com.sistemacontable.service.TerceroService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/terceros")
public class TerceroController {

    private final TerceroService terceroService;
    private final ApisPeruService apisPeruService;

    public TerceroController(TerceroService terceroService, ApisPeruService apisPeruService) {
        this.terceroService = terceroService;
        this.apisPeruService = apisPeruService;
    }

    @GetMapping
    public ResponseEntity<List<TerceroDto>> listar(
            @RequestParam(required = false) TipoTercero tipo,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(terceroService.listar(tipo, q));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TerceroDto> obtener(@PathVariable Integer id) {
        return ResponseEntity.ok(terceroService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<TerceroDto> crear(@RequestBody CrearTerceroDto dto) {
        return ResponseEntity.ok(terceroService.crear(dto));
    }

    @GetMapping("/consulta-dni/{dni}")
    public ResponseEntity<Map<String, Object>> consultarDni(@PathVariable String dni) {
        return ResponseEntity.ok(apisPeruService.consultarDni(dni));
    }

    @GetMapping("/consulta-ruc/{ruc}")
    public ResponseEntity<Map<String, Object>> consultarRuc(@PathVariable String ruc) {
        return ResponseEntity.ok(apisPeruService.consultarRuc(ruc));
    }
}
