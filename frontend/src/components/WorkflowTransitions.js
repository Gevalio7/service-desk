import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';

const WorkflowTransitions = ({ ticketId, onTransitionExecuted, currentUser }) => {
  const [transitions, setTransitions] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [workflowType, setWorkflowType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executingTransition, setExecutingTransition] = useState(null);

  useEffect(() => {
    if (ticketId) {
      fetchAvailableTransitions();
    }
  }, [ticketId]);

  const fetchAvailableTransitions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/tickets/${ticketId}/transitions/available`);
      
      setTransitions(response.data.transitions || []);
      setCurrentStatus(response.data.currentStatus);
      setWorkflowType(response.data.workflowType);
    } catch (error) {
      console.error('Ошибка получения доступных переходов:', error);
      setError(error.response?.data?.message || 'Ошибка загрузки переходов');
    } finally {
      setLoading(false);
    }
  };

  const executeTransition = async (transitionId, options = {}) => {
    try {
      setExecutingTransition(transitionId);
      setError(null);

      const response = await axios.post(
        `/api/tickets/${ticketId}/transitions/${transitionId}/execute`,
        options
      );

      // Обновляем список доступных переходов
      await fetchAvailableTransitions();
      
      // Уведомляем родительский компонент об успешном выполнении
      if (onTransitionExecuted) {
        onTransitionExecuted(response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Ошибка выполнения перехода:', error);
      const errorMessage = error.response?.data?.message || 'Ошибка выполнения перехода';
      setError(errorMessage);
      throw error;
    } finally {
      setExecutingTransition(null);
    }
  };

  const getStatusDisplayName = (status, locale = 'ru') => {
    if (!status) return 'Неизвестно';
    return status.displayName?.[locale] || status.displayName?.ru || status.displayName?.en || status.name;
  };

  const getTransitionDisplayName = (transition, locale = 'ru') => {
    if (!transition) return 'Неизвестно';
    return transition.displayName?.[locale] || transition.displayName?.ru || transition.displayName?.en || transition.name;
  };

  if (loading) {
    return (
      <div className="workflow-transitions-loading">
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
          <span>Загрузка доступных переходов...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflow-transitions-error">
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>
            <strong>Ошибка:</strong> {error}
            <button 
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={fetchAvailableTransitions}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-transitions">
      {/* Текущий статус */}
      {currentStatus && (
        <div className="current-status mb-3">
          <div className="d-flex align-items-center">
            <span className="text-muted me-2">Текущий статус:</span>
            <span 
              className="badge rounded-pill px-3 py-2"
              style={{ 
                backgroundColor: currentStatus.color || '#6c757d',
                color: '#fff'
              }}
            >
              {currentStatus.icon && (
                <i className={`bi bi-${currentStatus.icon} me-1`}></i>
              )}
              {getStatusDisplayName(currentStatus)}
            </span>
          </div>
        </div>
      )}

      {/* Доступные переходы */}
      {transitions.length > 0 ? (
        <div className="available-transitions">
          <h6 className="mb-3">
            <i className="bi bi-arrow-right-circle me-2"></i>
            Доступные действия
          </h6>
          
          <div className="transitions-list">
            {transitions.map((transition) => (
              <TransitionButton
                key={transition.id}
                transition={transition}
                isExecuting={executingTransition === transition.id}
                onExecute={executeTransition}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="no-transitions">
          <div className="text-muted text-center py-3">
            <i className="bi bi-info-circle me-2"></i>
            Нет доступных переходов для текущего статуса
          </div>
        </div>
      )}

      {/* Информация о workflow */}
      {workflowType && (
        <div className="workflow-info mt-3">
          <small className="text-muted">
            <i className="bi bi-diagram-3 me-1"></i>
            Workflow: {workflowType.displayName?.ru || workflowType.name}
          </small>
        </div>
      )}
    </div>
  );
};

const TransitionButton = ({ transition, isExecuting, onExecute, currentUser }) => {
  const [showModal, setShowModal] = useState(false);

  const getTransitionDisplayName = (transition, locale = 'ru') => {
    return transition.displayName?.[locale] || transition.displayName?.ru || transition.displayName?.en || transition.name;
  };

  const getStatusDisplayName = (status, locale = 'ru') => {
    if (!status) return 'Неизвестно';
    return status.displayName?.[locale] || status.displayName?.ru || status.displayName?.en || status.name;
  };

  const handleQuickExecute = async () => {
    if (transition.requiresComment || transition.requiresAssignment) {
      setShowModal(true);
    } else {
      try {
        await onExecute(transition.id);
      } catch (error) {
        // Ошибка уже обработана в родительском компоненте
      }
    }
  };

  const handleModalExecute = async (options) => {
    try {
      await onExecute(transition.id, options);
      setShowModal(false);
    } catch (error) {
      // Ошибка уже обработана в родительском компоненте
    }
  };

  return (
    <>
      <div className="transition-item mb-2">
        <button
          className="btn btn-outline-primary d-flex align-items-center justify-content-between w-100"
          onClick={handleQuickExecute}
          disabled={isExecuting}
          style={{ borderColor: transition.color, color: transition.color }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = transition.color;
            e.target.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = transition.color;
          }}
        >
          <div className="d-flex align-items-center">
            {transition.icon && (
              <i className={`bi bi-${transition.icon} me-2`}></i>
            )}
            <div className="text-start">
              <div className="fw-medium">
                {getTransitionDisplayName(transition)}
              </div>
              {transition.toStatus && (
                <small className="text-muted">
                  → {getStatusDisplayName(transition.toStatus)}
                </small>
              )}
            </div>
          </div>
          
          <div className="d-flex align-items-center">
            {(transition.requiresComment || transition.requiresAssignment) && (
              <small className="text-muted me-2">
                <i className="bi bi-gear"></i>
              </small>
            )}
            {isExecuting ? (
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Выполнение...</span>
              </div>
            ) : (
              <i className="bi bi-chevron-right"></i>
            )}
          </div>
        </button>
      </div>

      {/* Модальное окно для переходов с дополнительными параметрами */}
      {showModal && (
        <TransitionModal
          transition={transition}
          onExecute={handleModalExecute}
          onCancel={() => setShowModal(false)}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

const TransitionModal = ({ transition, onExecute, onCancel, currentUser }) => {
  const [comment, setComment] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [availableAssignees, setAvailableAssignees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  useEffect(() => {
    if (transition.requiresAssignment) {
      fetchAvailableAssignees();
    }
  }, [transition.requiresAssignment]);

  const fetchAvailableAssignees = async () => {
    try {
      setLoadingAssignees(true);
      const response = await axios.get('/api/tickets/assignees/available');
      setAvailableAssignees(response.data.assignees || []);
    } catch (error) {
      console.error('Ошибка получения списка исполнителей:', error);
    } finally {
      setLoadingAssignees(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (transition.requiresComment && !comment.trim()) {
      alert('Комментарий обязателен для этого перехода');
      return;
    }

    if (transition.requiresAssignment && !assigneeId) {
      alert('Назначение исполнителя обязательно для этого перехода');
      return;
    }

    setLoading(true);
    try {
      await onExecute({
        comment: comment.trim() || undefined,
        assigneeId: assigneeId || undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransitionDisplayName = (transition, locale = 'ru') => {
    return transition.displayName?.[locale] || transition.displayName?.ru || transition.displayName?.en || transition.name;
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`bi bi-${transition.icon || 'arrow-right'} me-2`}></i>
              {getTransitionDisplayName(transition)}
            </h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {transition.requiresComment && (
                <div className="mb-3">
                  <label htmlFor="comment" className="form-label">
                    Комментарий <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="comment"
                    className="form-control"
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Введите комментарий к переходу..."
                    required={transition.requiresComment}
                  />
                </div>
              )}

              {transition.requiresAssignment && (
                <div className="mb-3">
                  <label htmlFor="assignee" className="form-label">
                    Назначить исполнителя <span className="text-danger">*</span>
                  </label>
                  {loadingAssignees ? (
                    <div className="text-center py-2">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Загрузка исполнителей...
                    </div>
                  ) : (
                    <select
                      id="assignee"
                      className="form-select"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      required={transition.requiresAssignment}
                    >
                      <option value="">Выберите исполнителя...</option>
                      {availableAssignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.name} ({assignee.role})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {!transition.requiresComment && !transition.requiresAssignment && (
                <div className="text-muted">
                  <i className="bi bi-info-circle me-2"></i>
                  Переход будет выполнен без дополнительных параметров.
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Отмена
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
                style={{ backgroundColor: transition.color, borderColor: transition.color }}
              >
                {loading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    Выполнение...
                  </>
                ) : (
                  <>
                    <i className={`bi bi-${transition.icon || 'arrow-right'} me-2`}></i>
                    Выполнить переход
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkflowTransitions;