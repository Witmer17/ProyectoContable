package com.sistemacontable.controller;

import com.sistemacontable.dto.CrearProductoDto;
import com.sistemacontable.dto.ProductoDto;
import com.sistemacontable.service.ProductoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @GetMapping
    public ResponseEntity<List<ProductoDto>> listar() {
        return ResponseEntity.ok(productoService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoDto> obtener(@PathVariable Integer id) {
        return ResponseEntity.ok(productoService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<ProductoDto> crear(@RequestBody CrearProductoDto dto) {
        return ResponseEntity.ok(productoService.crear(dto));
    }

    @GetMapping("/{id}/kardex")
    public ResponseEntity<Map<String, Object>> getKardex(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("movimientos", Collections.emptyList()));
    }
}
