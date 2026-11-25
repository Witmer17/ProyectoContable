package com.sistemacontable.mapper;

import com.sistemacontable.dto.TerceroDto;
import com.sistemacontable.entity.Tercero;
import org.springframework.stereotype.Component;

@Component
public class TerceroMapper {

    public TerceroDto toDto(Tercero entity) {
        if (entity == null) return null;
        TerceroDto dto = new TerceroDto();
        dto.setId(entity.getId());
        dto.setTipo(entity.getTipo());
        dto.setTipoDoc(entity.getTipoDoc());
        dto.setDocumento(entity.getDocumento());
        dto.setNombre(entity.getNombre());
        dto.setDireccion(entity.getDireccion());
        dto.setSueldo(entity.getSueldo());
        dto.setPension(entity.getPension());
        dto.setActivo(entity.getActivo());
        return dto;
    }
}
