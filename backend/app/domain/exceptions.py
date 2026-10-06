"""
Excepciones de dominio contable
"""

class ContabilidadDomainException(Exception):
    """Excepción base para el dominio contable."""
    pass

class PartidaDesbalanceadaError(ContabilidadDomainException):
    """Se lanza cuando la suma de Débitos no es igual a la suma de Créditos (tolerancia 0.01)."""
    pass

class PeriodoCerradoError(ContabilidadDomainException):
    """Se lanza cuando se intenta operar sobre un período fiscal cerrado o bloqueado."""
    pass

class CuentaInvalidaError(ContabilidadDomainException):
    """Se lanza cuando una cuenta contable no existe o se encuentra inactiva/bloqueada."""
    pass

class ConcurrencyConflictError(ContabilidadDomainException):
    """Se lanza cuando falla el versionamiento optimista al modificar un asiento."""
    pass

class DeadlockError(ContabilidadDomainException):
    """Se lanza cuando ocurre contención o riesgo de bloqueo en la base de datos."""
    pass

class RectificacionInvalidaError(ContabilidadDomainException):
    """Se lanza cuando una rectificación contable no cumple las reglas de auditoría."""
    pass
