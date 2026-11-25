package com.sistemacontable.service;

import com.sistemacontable.dto.CrearProductoDto;
import com.sistemacontable.dto.ProductoDto;
import com.sistemacontable.entity.Producto;
import com.sistemacontable.mapper.ProductoMapper;
import com.sistemacontable.repository.ProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final ProductoMapper productoMapper;

    public ProductoService(ProductoRepository productoRepository, ProductoMapper productoMapper) {
        this.productoRepository = productoRepository;
        this.productoMapper = productoMapper;
    }

    public List<ProductoDto> listar() {
        return productoRepository.findAll().stream()
                .map(productoMapper::toDto)
                .collect(Collectors.toList());
    }

    public ProductoDto obtener(Integer id) {
        return productoRepository.findById(id)
                .map(productoMapper::toDto)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    @Transactional
    public ProductoDto crear(CrearProductoDto dto) {
        if (productoRepository.existsByCodigo(dto.getCodigo().trim())) {
            throw new RuntimeException("El código de producto " + dto.getCodigo() + " ya existe");
        }

        Producto p = new Producto();
        p.setCodigo(dto.getCodigo().trim().toUpperCase());
        p.setNombre(dto.getNombre().trim());
        p.setUnidad(dto.getUnidad() != null ? dto.getUnidad() : "UND");
        p.setStock(dto.getStock() != null ? dto.getStock() : BigDecimal.ZERO);
        p.setCostoPromedio(dto.getCostoPromedio() != null ? dto.getCostoPromedio() : BigDecimal.ZERO);
        p.setValorTotal(p.getStock().multiply(p.getCostoPromedio()));
        p.setTipo(dto.getTipo() != null ? dto.getTipo() : "MERCADERIA");

        return productoMapper.toDto(productoRepository.save(p));
    }
}
