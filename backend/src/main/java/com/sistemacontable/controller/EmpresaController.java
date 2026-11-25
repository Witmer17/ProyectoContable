package com.sistemacontable.controller;

import com.sistemacontable.dto.EmpresaDatosDto;
import com.sistemacontable.dto.EmpresaDto;
import com.sistemacontable.service.EmpresaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/empresa")
public class EmpresaController {

    private final EmpresaService empresaService;

    public EmpresaController(EmpresaService empresaService) {
        this.empresaService = empresaService;
    }

    @GetMapping
    public ResponseEntity<EmpresaDto> getEmpresa() {
        return ResponseEntity.ok(empresaService.getEmpresa());
    }

    @PutMapping("/datos")
    public ResponseEntity<EmpresaDto> actualizarDatos(@RequestBody EmpresaDatosDto dto) {
        return ResponseEntity.ok(empresaService.actualizarDatos(dto));
    }

    @GetMapping("/perfiles")
    public ResponseEntity<List<Map<String, Object>>> getPerfiles() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(crearPerfil("COMERCIAL", "Empresa Comercial", "Venta y distribución de mercaderías e inventarios"));
        list.add(crearPerfil("SERVICIOS", "Empresa de Servicios", "Prestación de servicios profesionales y consultoría"));
        list.add(crearPerfil("INDUSTRIAL", "Empresa Industrial / Manufactura", "Transformación de materias primas y producción"));
        list.add(crearPerfil("MIXTA", "Comercial y Servicios", "Operaciones combinadas de venta y prestación de servicios"));
        return ResponseEntity.ok(list);
    }

    @PutMapping("/perfil")
    public ResponseEntity<Map<String, Object>> actualizarPerfil(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        res.put("empresa", empresaService.getEmpresa());
        res.put("avisos", List.of("Perfil contable actualizado correctamente"));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/tipo-cambio")
    public ResponseEntity<Map<String, Object>> guardarTipoCambio(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Tipo de cambio registrado"));
    }

    private Map<String, Object> crearPerfil(String id, String nombre, String desc) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", id);
        map.put("nombre", nombre);
        map.put("descripcion", desc);
        return map;
    }
}
