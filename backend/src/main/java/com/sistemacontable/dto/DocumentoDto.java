package com.sistemacontable.dto;

import com.sistemacontable.entity.enums.Condicion;
import com.sistemacontable.entity.enums.SentidoDocumento;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DocumentoDto {
    private Integer id;
    private SentidoDocumento sentido;
    private String tipo;
    private String serie;
    private String numero;
    private Integer terceroId;
    private String terceroNombre;
    private String terceroDocumento;
    private String terceroTipoDoc;
    private LocalDate fecha;
    private LocalDate vencimiento;
    private BigDecimal base;
    private BigDecimal igv;
    private BigDecimal total;
    private BigDecimal saldo;
    private Condicion condicion;
    private Integer asientoId;
    private Integer asientoNumero;
    private Boolean anulado;

    public DocumentoDto() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

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

    public String getTerceroNombre() { return terceroNombre; }
    public void setTerceroNombre(String terceroNombre) { this.terceroNombre = terceroNombre; }

    public String getTerceroDocumento() { return terceroDocumento; }
    public void setTerceroDocumento(String terceroDocumento) { this.terceroDocumento = terceroDocumento; }

    public String getTerceroTipoDoc() { return terceroTipoDoc; }
    public void setTerceroTipoDoc(String terceroTipoDoc) { this.terceroTipoDoc = terceroTipoDoc; }

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

    public BigDecimal getSaldo() { return saldo; }
    public void setSaldo(BigDecimal saldo) { this.saldo = saldo; }

    public Condicion getCondicion() { return condicion; }
    public void setCondicion(Condicion condicion) { this.condicion = condicion; }

    public Integer getAsientoId() { return asientoId; }
    public void setAsientoId(Integer asientoId) { this.asientoId = asientoId; }

    public Integer getAsientoNumero() { return asientoNumero; }
    public void setAsientoNumero(Integer asientoNumero) { this.asientoNumero = asientoNumero; }

    public Boolean getAnulado() { return anulado; }
    public void setAnulado(Boolean anulado) { this.anulado = anulado; }
}
