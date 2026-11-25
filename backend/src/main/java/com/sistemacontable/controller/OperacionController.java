package com.sistemacontable.controller;

import com.sistemacontable.dto.OperacionRequestDto;
import com.sistemacontable.dto.PrevisualizarResponseDto;
import com.sistemacontable.service.OperacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/operaciones")
public class OperacionController {

    private final OperacionService operacionService;

    public OperacionController(OperacionService operacionService) {
        this.operacionService = operacionService;
    }

    @PostMapping("/previsualizar")
    public ResponseEntity<PrevisualizarResponseDto> previsualizar(@RequestBody OperacionRequestDto request) {
        return ResponseEntity.ok(operacionService.previsualizar(request));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> registrar(@RequestBody OperacionRequestDto request, Authentication authentication) {
        Integer usuarioId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Integer) {
            usuarioId = (Integer) authentication.getPrincipal();
        }
        return ResponseEntity.ok(operacionService.registrar(request, usuarioId));
    }

    @GetMapping("/catalogo")
    public ResponseEntity<List<Map<String, Object>>> catalogo() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(crearTarjeta("COMPRA_MERCADERIA", "Compra de mercadería", "shopping_cart"));
        list.add(crearTarjeta("VENTA_MERCADERIA", "Venta de mercadería", "point_of_sale"));
        list.add(crearTarjeta("PAGO_SERVICIO", "Pago de servicios (Luz, agua, etc.)", "receipt_long"));
        list.add(crearTarjeta("HONORARIOS", "Recibo por honorarios", "person"));
        list.add(crearTarjeta("COBRANZA", "Cobranza de clientes", "account_balance_wallet"));
        list.add(crearTarjeta("PAGO_PROVEEDOR", "Pago a proveedores", "payments"));
        list.add(crearTarjeta("COMPRA_ACTIVO", "Compra de activo fijo", "directions_car"));
        list.add(crearTarjeta("VENTA_SERVICIO", "Venta de servicios", "work"));
        list.add(crearTarjeta("PLANILLA", "Planilla de sueldos", "badge"));
        list.add(crearTarjeta("DEPRECIACION", "Depreciación del mes", "trending_down"));
        list.add(crearTarjeta("LIQUIDACION_IGV", "Liquidación mensual de IGV", "account_balance"));
        list.add(crearTarjeta("APORTE_CAPITAL", "Aporte de capital", "savings"));
        list.add(crearTarjeta("ESPECIAL", "Operación especial / anticipos", "auto_fix_high"));
        list.add(crearTarjeta("MANUAL", "Asiento contable manual", "edit_note"));
        return ResponseEntity.ok(list);
    }

    private Map<String, Object> crearTarjeta(String tipo, String titulo, String icono) {
        Map<String, Object> map = new HashMap<>();
        map.put("tipo", tipo);
        map.put("titulo", titulo);
        map.put("icono", icono);
        return map;
    }
}
