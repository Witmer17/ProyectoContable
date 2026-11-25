package com.sistemacontable.service;

import com.sistemacontable.dto.CrearTerceroDto;
import com.sistemacontable.dto.TerceroDto;
import com.sistemacontable.entity.Tercero;
import com.sistemacontable.entity.enums.TipoTercero;
import com.sistemacontable.mapper.TerceroMapper;
import com.sistemacontable.repository.TerceroRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TerceroService {

    private final TerceroRepository terceroRepository;
    private final TerceroMapper terceroMapper;

    public TerceroService(TerceroRepository terceroRepository, TerceroMapper terceroMapper) {
        this.terceroRepository = terceroRepository;
        this.terceroMapper = terceroMapper;
    }

    public List<TerceroDto> listar(TipoTercero tipo, String q) {
        List<Tercero> lista;
        String query = q != null && !q.isBlank() ? q.trim() : null;

        if (tipo != null && query != null) {
            lista = terceroRepository.findByTipoAndDocumentoContainingIgnoreCaseOrTipoAndNombreContainingIgnoreCaseOrderByNombreAsc(tipo, query, tipo, query);
        } else if (tipo != null) {
            lista = terceroRepository.findByTipoOrderByNombreAsc(tipo);
        } else if (query != null) {
            lista = terceroRepository.findByDocumentoContainingIgnoreCaseOrNombreContainingIgnoreCaseOrderByNombreAsc(query, query);
        } else {
            lista = terceroRepository.findAll();
        }

        return lista.stream().map(terceroMapper::toDto).collect(Collectors.toList());
    }

    public TerceroDto obtener(Integer id) {
        return terceroRepository.findById(id)
                .map(terceroMapper::toDto)
                .orElseThrow(() -> new RuntimeException("Tercero no encontrado"));
    }

    @Transactional
    public TerceroDto crear(CrearTerceroDto dto) {
        Optional<Tercero> existente = terceroRepository.findByTipoAndDocumento(dto.getTipo(), dto.getDocumento().trim());
        if (existente.isPresent()) {
            return terceroMapper.toDto(existente.get());
        }

        Tercero t = new Tercero();
        t.setTipo(dto.getTipo());
        t.setTipoDoc(dto.getTipoDoc() != null ? dto.getTipoDoc() : (dto.getDocumento().length() == 11 ? "RUC" : "DNI"));
        t.setDocumento(dto.getDocumento().trim());
        t.setNombre(dto.getNombre().trim());
        t.setDireccion(dto.getDireccion());
        t.setSueldo(dto.getSueldo());
        t.setPension(dto.getPension());
        t.setActivo(true);

        return terceroMapper.toDto(terceroRepository.save(t));
    }
}
