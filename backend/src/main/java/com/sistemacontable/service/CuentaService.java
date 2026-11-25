package com.sistemacontable.service;

import com.sistemacontable.dto.ActualizarCuentaDto;
import com.sistemacontable.dto.CrearCuentaDto;
import com.sistemacontable.dto.CuentaDto;
import com.sistemacontable.entity.Cuenta;
import com.sistemacontable.mapper.CuentaMapper;
import com.sistemacontable.repository.CuentaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CuentaService {

    private final CuentaRepository cuentaRepository;
    private final CuentaMapper cuentaMapper;

    public CuentaService(CuentaRepository cuentaRepository, CuentaMapper cuentaMapper) {
        this.cuentaRepository = cuentaRepository;
        this.cuentaMapper = cuentaMapper;
    }

    public List<CuentaDto> listar(Integer elemento, String grupo, String q) {
        List<Cuenta> lista;
        String query = q != null && !q.isBlank() ? q.trim() : null;

        if (grupo != null && !grupo.isBlank()) {
            lista = cuentaRepository.findByCodigoStartingWithOrderByCodigoAsc(grupo.trim());
        } else if (elemento != null && query != null) {
            lista = cuentaRepository.findByElementoAndCodigoContainingIgnoreCaseOrElementoAndNombreContainingIgnoreCaseOrderByCodigoAsc(elemento, query, elemento, query);
        } else if (elemento != null) {
            lista = cuentaRepository.findByElementoOrderByCodigoAsc(elemento);
        } else if (query != null) {
            lista = cuentaRepository.findByCodigoContainingIgnoreCaseOrNombreContainingIgnoreCaseOrderByCodigoAsc(query, query);
        } else {
            lista = cuentaRepository.findAll();
        }
        return lista.stream().map(cuentaMapper::toDto).collect(Collectors.toList());
    }

    public CuentaDto obtener(String codigo) {
        Cuenta cuenta = cuentaRepository.findById(codigo)
                .orElseThrow(() -> new RuntimeException("Cuenta " + codigo + " no encontrada"));
        return cuentaMapper.toDto(cuenta);
    }

    @Transactional
    public CuentaDto crear(CrearCuentaDto dto) {
        String codigo = dto.getCodigo().trim();
        if (cuentaRepository.existsById(codigo)) {
            throw new RuntimeException("La cuenta " + codigo + " ya existe");
        }

        int elemento = Character.getNumericValue(codigo.charAt(0));
        int nivel = codigo.length() <= 2 ? 2 : (codigo.length() <= 3 ? 3 : (codigo.length() <= 4 ? 4 : 5));

        Cuenta cuenta = new Cuenta();
        cuenta.setCodigo(codigo);
        cuenta.setNombre(dto.getNombre().trim());
        cuenta.setElemento(elemento);
        cuenta.setNaturaleza(dto.getNaturaleza() != null ? dto.getNaturaleza() : (elemento >= 6 && elemento != 7 ? "DEUDORA" : "ACREEDORA"));
        cuenta.setNivel(nivel);
        cuenta.setUltimoNivel(true);
        cuenta.setRequiereDestino(dto.getRequiereDestino() != null ? dto.getRequiereDestino() : (codigo.startsWith("60") || codigo.startsWith("62") || codigo.startsWith("63") || codigo.startsWith("64") || codigo.startsWith("65") || codigo.startsWith("68")));
        cuenta.setDestinoDefecto(dto.getDestinoDefecto());
        cuenta.setActiva(true);
        cuenta.setPerfiles(new ArrayList<>());
        cuenta.setUso(0);

        return cuentaMapper.toDto(cuentaRepository.save(cuenta));
    }

    @Transactional
    public CuentaDto actualizar(String codigo, ActualizarCuentaDto dto) {
        Cuenta cuenta = cuentaRepository.findById(codigo)
                .orElseThrow(() -> new RuntimeException("Cuenta " + codigo + " no encontrada"));

        if (dto.getNombre() != null) cuenta.setNombre(dto.getNombre().trim());
        if (dto.getNaturaleza() != null) cuenta.setNaturaleza(dto.getNaturaleza());
        if (dto.getDestinoDefecto() != null) cuenta.setDestinoDefecto(dto.getDestinoDefecto());
        if (dto.getRequiereDestino() != null) cuenta.setRequiereDestino(dto.getRequiereDestino());
        if (dto.getActiva() != null) cuenta.setActiva(dto.getActiva());

        return cuentaMapper.toDto(cuentaRepository.save(cuenta));
    }
}
