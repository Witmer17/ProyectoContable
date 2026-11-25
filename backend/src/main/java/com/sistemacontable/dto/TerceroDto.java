package com.sistemacontable.dto;

import com.sistemacontable.entity.enums.TipoTercero;
import java.math.BigDecimal;

public class TerceroDto {
    private Integer id;
    private TipoTercero tipo;
    private String tipoDoc;
    private String documento;
    private String nombre;
    private String direccion;
    private BigDecimal sueldo;
    private String pension;
    private Boolean activo;

    public TerceroDto() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public TipoTercero getTipo() { return tipo; }
    public void setTipo(TipoTercero tipo) { this.tipo = tipo; }

    public String getTipoDoc() { return tipoDoc; }
    public void setTipoDoc(String tipoDoc) { this.tipoDoc = tipoDoc; }

    public String getDocumento() { return documento; }
    public void setDocumento(String documento) { this.documento = documento; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }

    public BigDecimal getSueldo() { return sueldo; }
    public void setSueldo(BigDecimal sueldo) { this.sueldo = sueldo; }

    public String getPension() { return pension; }
    public void setPension(String pension) { this.pension = pension; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}
