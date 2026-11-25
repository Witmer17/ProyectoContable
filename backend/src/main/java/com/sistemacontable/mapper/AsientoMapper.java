package com.sistemacontable.mapper;

import com.sistemacontable.dto.AsientoDto;
import com.sistemacontable.entity.Asiento;
import com.sistemacontable.entity.AsientoLinea;
import com.sistemacontable.entity.Cuenta;
import com.sistemacontable.repository.CuentaRepository;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class AsientoMapper {

    private final CuentaRepository cuentaRepository;
    private final Map<String, String> cacheCuentasPrincipales = new ConcurrentHashMap<>();

    public AsientoMapper(CuentaRepository cuentaRepository) {
        this.cuentaRepository = cuentaRepository;
    }

    public AsientoDto toDto(Asiento entity) {
        if (entity == null) return null;
        AsientoDto dto = new AsientoDto();
        dto.setId(entity.getId());
        dto.setNumero(entity.getNumero());
        dto.setFecha(entity.getFecha());
        dto.setPeriodo(entity.getPeriodo());
        dto.setOperacion(entity.getOperacion());
        dto.setGlosa(entity.getGlosa());
        dto.setCodigoLibro(entity.getCodigoLibro());
        dto.setDocumentoSustentatorio(entity.getDocumentoSustentatorio());
        dto.setEstado(entity.getEstado());
        dto.setMotivoAnulacion(entity.getMotivoAnulacion());
        dto.setReversionId(entity.getReversionId());
        dto.setRevierteA(entity.getRevierteA());
        dto.setCreadoEn(entity.getCreadoEn());

        if (entity.getLineas() != null) {
            final String numCorrelativo = String.format("%04d", entity.getNumero());
            final String codLibro = entity.getCodigoLibro();
            final String docSust = entity.getDocumentoSustentatorio();

            dto.setLineas(entity.getLineas().stream().map(l -> {
                AsientoDto.LineaDto ldto = toLineaDto(l);
                ldto.setCorrelativo(numCorrelativo);
                ldto.setCodigoLibro(codLibro);
                if (ldto.getDocumentoSustentatorio() == null || ldto.getDocumentoSustentatorio().isBlank()) {
                    ldto.setDocumentoSustentatorio(docSust);
                }
                return ldto;
            }).collect(Collectors.toList()));
        }
        return dto;
    }

    public AsientoDto.LineaDto toLineaDto(AsientoLinea linea) {
        if (linea == null) return null;
        AsientoDto.LineaDto dto = new AsientoDto.LineaDto();
        dto.setId(linea.getId());
        dto.setOrden(linea.getOrden());
        dto.setCuentaCodigo(linea.getCuentaCodigo());
        dto.setCuentaNombre(linea.getCuenta() != null ? linea.getCuenta().getNombre() : null);
        dto.setDocumentoSustentatorio(linea.getDocumentoSustentatorio());
        dto.setDebe(linea.getDebe());
        dto.setHaber(linea.getHaber());
        dto.setEtapa(linea.getEtapa());
        dto.setTerceroId(linea.getTerceroId());
        dto.setTerceroNombre(linea.getTercero() != null ? linea.getTercero().getNombre() : null);
        dto.setGlosa(linea.getGlosa());

        // Resolver cuenta principal (2 dígitos)
        String cta = linea.getCuentaCodigo();
        if (cta != null && cta.length() >= 2) {
            String padreCodigo = cta.substring(0, 2);
            dto.setCuentaPadreCodigo(padreCodigo);
            dto.setCuentaPadreNombre(obtenerNombreCuentaPrincipal(padreCodigo));
        }

        return dto;
    }

    private String obtenerNombreCuentaPrincipal(String codigo2Digitos) {
        return cacheCuentasPrincipales.computeIfAbsent(codigo2Digitos, cod ->
            cuentaRepository.findById(cod).map(Cuenta::getNombre).orElse("Cuenta " + cod)
        );
    }
}
