package com.sistemacontable.mapper;

import com.sistemacontable.dto.EmpresaDto;
import com.sistemacontable.entity.Empresa;
import org.springframework.stereotype.Component;

@Component
public class EmpresaMapper {

    public EmpresaDto toDto(Empresa entity) {
        if (entity == null) return null;
        EmpresaDto dto = new EmpresaDto();
        dto.setId(entity.getId());
        dto.setRuc(entity.getRuc());
        dto.setRazonSocial(entity.getRazonSocial());
        dto.setActividad(entity.getActividad());
        dto.setTienePlanilla(entity.getTienePlanilla());
        dto.setTieneActivos(entity.getTieneActivos());
        dto.setUsaDolares(entity.getUsaDolares());
        dto.setRecibeHonorarios(entity.getRecibeHonorarios());
        dto.setIgvTasa(entity.getIgvTasa());
        dto.setRetencionTasa(entity.getRetencionTasa());
        dto.setMetodoKardex(entity.getMetodoKardex());
        dto.setConfigurada(entity.getConfigurada());
        dto.setPerfil(entity.getPerfil());
        return dto;
    }
}
