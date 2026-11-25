package com.sistemacontable.service;

import com.sistemacontable.entity.Auditoria;
import com.sistemacontable.repository.AuditoriaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditoriaService {

    private final AuditoriaRepository auditoriaRepository;

    public AuditoriaService(AuditoriaRepository auditoriaRepository) {
        this.auditoriaRepository = auditoriaRepository;
    }

    public List<Auditoria> listarRecientes() {
        return auditoriaRepository.findTop100ByOrderByFechaDesc();
    }
}
