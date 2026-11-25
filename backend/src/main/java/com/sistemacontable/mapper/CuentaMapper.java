package com.sistemacontable.mapper;

import com.sistemacontable.dto.CuentaDto;
import com.sistemacontable.entity.Cuenta;
import org.springframework.stereotype.Component;

@Component
public class CuentaMapper {

    public CuentaDto toDto(Cuenta entity) {
        if (entity == null) return null;
        CuentaDto dto = new CuentaDto();
        dto.setCodigo(entity.getCodigo());
        dto.setNombre(entity.getNombre());
        dto.setElemento(entity.getElemento());
        dto.setNaturaleza(entity.getNaturaleza());
        dto.setNivel(entity.getNivel());
        dto.setUltimoNivel(entity.getUltimoNivel());
        dto.setRequiereDestino(entity.getRequiereDestino());
        dto.setDestinoDefecto(entity.getDestinoDefecto());
        dto.setCodigoPadre(entity.getCodigoPadre() != null ? entity.getCodigoPadre() : (entity.getCodigo().length() > 2 ? entity.getCodigo().substring(0, 2) : null));
        dto.setDenominacion(entity.getNombre());
        dto.setEsImputable(entity.getUltimoNivel());
        dto.setActiva(entity.getActiva());
        dto.setPerfiles(entity.getPerfiles());
        dto.setModulo(entity.getModulo());
        dto.setUso(entity.getUso());
        return dto;
    }
}
