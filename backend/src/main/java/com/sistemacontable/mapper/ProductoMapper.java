package com.sistemacontable.mapper;

import com.sistemacontable.dto.ProductoDto;
import com.sistemacontable.entity.Producto;
import org.springframework.stereotype.Component;

@Component
public class ProductoMapper {

    public ProductoDto toDto(Producto entity) {
        if (entity == null) return null;
        ProductoDto dto = new ProductoDto();
        dto.setId(entity.getId());
        dto.setCodigo(entity.getCodigo());
        dto.setNombre(entity.getNombre());
        dto.setUnidad(entity.getUnidad());
        dto.setStock(entity.getStock());
        dto.setCostoPromedio(entity.getCostoPromedio());
        dto.setValorTotal(entity.getValorTotal());
        dto.setTipo(entity.getTipo());
        return dto;
    }
}
