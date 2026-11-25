package com.sistemacontable.service;

import com.sistemacontable.entity.Periodo;
import com.sistemacontable.repository.PeriodoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PeriodoService {

    private final PeriodoRepository periodoRepository;

    public PeriodoService(PeriodoRepository periodoRepository) {
        this.periodoRepository = periodoRepository;
    }

    public List<Periodo> listarPorAnio(Integer anio) {
        List<Periodo> lista = periodoRepository.findByAnioOrderByMesAsc(anio);
        if (lista.isEmpty()) {
            for (int m = 1; m <= 12; m++) {
                Periodo p = new Periodo();
                p.setAnio(anio);
                p.setMes(m);
                p.setCerrado(false);
                periodoRepository.save(p);
            }
            lista = periodoRepository.findByAnioOrderByMesAsc(anio);
        }
        return lista;
    }

    public Periodo cerrar(Integer anio, Integer mes, String motivo) {
        Periodo p = periodoRepository.findByAnioAndMes(anio, mes).orElseGet(() -> {
            Periodo nuevo = new Periodo();
            nuevo.setAnio(anio);
            nuevo.setMes(mes);
            return nuevo;
        });
        p.setCerrado(true);
        p.setMotivo(motivo);
        p.setCerradoEn(LocalDateTime.now());
        return periodoRepository.save(p);
    }
}
