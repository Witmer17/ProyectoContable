package com.sistemacontable.service;

import com.sistemacontable.entity.ActivoFijo;
import com.sistemacontable.repository.ActivoFijoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ActivoService {

    private final ActivoFijoRepository activoFijoRepository;

    public ActivoService(ActivoFijoRepository activoFijoRepository) {
        this.activoFijoRepository = activoFijoRepository;
    }

    public List<ActivoFijo> listar() {
        return activoFijoRepository.findAll();
    }

    public ActivoFijo guardar(ActivoFijo activo) {
        return activoFijoRepository.save(activo);
    }
}
