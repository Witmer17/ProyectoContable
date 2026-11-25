package com.sistemacontable.controller;

import com.sistemacontable.dto.CrearDocumentoDto;
import com.sistemacontable.dto.DocumentoDto;
import com.sistemacontable.entity.enums.SentidoDocumento;
import com.sistemacontable.service.DocumentoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/documentos")
public class DocumentoController {

    private final DocumentoService documentoService;

    public DocumentoController(DocumentoService documentoService) {
        this.documentoService = documentoService;
    }

    @GetMapping("/pendientes-asiento")
    public ResponseEntity<List<DocumentoDto>> listarPendientesAsiento() {
        return ResponseEntity.ok(documentoService.listarPendientesAsiento());
    }

    @GetMapping
    public ResponseEntity<List<DocumentoDto>> listar(
            @RequestParam(required = false) SentidoDocumento sentido,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(documentoService.listar(sentido, desde, hasta));
    }

    @PostMapping
    public ResponseEntity<DocumentoDto> registrar(@RequestBody CrearDocumentoDto dto) {
        return ResponseEntity.ok(documentoService.registrar(dto));
    }
}
