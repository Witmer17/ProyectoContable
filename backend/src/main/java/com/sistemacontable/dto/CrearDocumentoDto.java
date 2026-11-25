package com.sistemacontable.dto;

import com.sistemacontable.entity.enums.Condicion;
import com.sistemacontable.entity.enums.SentidoDocumento;

import java.math.BigDecimal;
import java.time.LocalDate;

public class CrearDocumentoDto {
    private SentidoDocumento sentido; // COMPRA o VENTA
    private String tipo;              // 01, 03, 14, etc.
    private String serie;
    private String numero;
    private Integer terceroId;
    private String tipoDocTercero;    // RUC o DNI
    private String documentoTercero;
    private String nombreTercero;
    private LocalDate fecha;
    private LocalDate vencimiento;
    private BigDecimal base;
    private BigDecimal igv;
    private BigDecimal total;
    private Condicion condicion;

    public CrearDocumentoDto() {}

    public SentidoDocumento getSentido() { return sentido; }
    public void setSentido(SentidoDocumento sentido) { this.sentido = sentido; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getSerie() { return serie; }
    public void setSerie(String serie) { this.serie = serie; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public Integer getTerceroId() { return terceroId; }
    public void setTerceroId(Integer terceroId) { this.terceroId = terceroId; }

    public String getTipoDocTercero() { return tipoDocTercero; }
    public void setTipoDocTercero(String tipoDocTercero) { this.tipoDocTercero = tipoDocTercero; }

    public String getDocumentoTercero() { return documentoTercero; }
    public void setDocumentoTercero(String documentoTercero) { this.documentoTercero = documentoTercero; }

    public String getNombreTercero() { return nombreTercero; }
    public void setNombreTercero(String nombreTercero) { this.nombreTercero = nombreTercero; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public LocalDate getVencimiento() { return vencimiento; }
    public void setVencimiento(LocalDate vencimiento) { this.vencimiento = vencimiento; }

    public BigDecimal getBase() { return base; }
    public void setBase(BigDecimal base) { this.base = base; }

    public BigDecimal getIgv() { return igv; }
    public void setIgv(BigDecimal igv) { this.igv = igv; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public Condicion getCondicion() { return condicion; }
    public void setCondicion(Condicion condicion) { this.condicion = condicion; }
}
