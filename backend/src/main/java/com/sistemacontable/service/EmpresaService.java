package com.sistemacontable.service;

import com.sistemacontable.dto.EmpresaDatosDto;
import com.sistemacontable.dto.EmpresaDto;
import com.sistemacontable.entity.Empresa;
import com.sistemacontable.mapper.EmpresaMapper;
import com.sistemacontable.repository.EmpresaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmpresaService {

    private final EmpresaRepository empresaRepository;
    private final EmpresaMapper empresaMapper;

    public EmpresaService(EmpresaRepository empresaRepository, EmpresaMapper empresaMapper) {
        this.empresaRepository = empresaRepository;
        this.empresaMapper = empresaMapper;
    }

    public EmpresaDto getEmpresa() {
        Empresa empresa = empresaRepository.findById(1).orElseGet(() -> {
            Empresa nueva = new Empresa();
            nueva.setId(1);
            nueva.setRuc("20000000001");
            nueva.setRazonSocial("EMPRESA GENERAL S.A.C.");
            return empresaRepository.save(nueva);
        });
        return empresaMapper.toDto(empresa);
    }

    @Transactional
    public EmpresaDto actualizarDatos(EmpresaDatosDto dto) {
        Empresa empresa = empresaRepository.findById(1).orElseGet(() -> {
            Empresa nueva = new Empresa();
            nueva.setId(1);
            return nueva;
        });

        if (dto.getRuc() != null) empresa.setRuc(dto.getRuc());
        if (dto.getRazonSocial() != null) empresa.setRazonSocial(dto.getRazonSocial());
        if (dto.getActividad() != null) empresa.setActividad(dto.getActividad());
        if (dto.getIgvTasa() != null) empresa.setIgvTasa(dto.getIgvTasa());
        if (dto.getRetencionTasa() != null) empresa.setRetencionTasa(dto.getRetencionTasa());
        if (dto.getMetodoKardex() != null) empresa.setMetodoKardex(dto.getMetodoKardex());
        empresa.setConfigurada(true);

        return empresaMapper.toDto(empresaRepository.save(empresa));
    }
}
