import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';

const WorkflowHistory = ({ ticketId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [includeDetails, setIncludeDetails] = useState(false);

  useEffect(() => {
    if (ticketId) {
      fetchWorkflowHistory();
    }
  }, [ticketId, pagination.page, includeDetails]);

  const fetchWorkflowHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/tickets/${ticketId}/workflow/history`, {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          includeDetails: includeDetails
        }
      });
      
      setHistory(response.data.history || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Ошибка получения истории workflow:', error);
      setError(error.response?.data?.message || 'Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}с`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}м ${seconds % 60}с`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}ч ${minutes % 60}м`;
  };

  const getStatusDisplayName = (status, locale = 'ru') => {
    if (!status) return 'Неизвестно';
    return status.displayName?.[locale] || status.displayName?.ru || status.displayName?.en || status.name;
  };

  const getTransitionDisplayName = (transition, locale = 'ru') => {
    if (!transition) return 'Неизвестно';
    return transition.displayName?.[locale] || transition.displayName?.ru || transition.displayName?.en || transition.name;
  };

  if (loading && history.length === 0) {
    return (
      <div className="workflow-history-loading">
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
          <span>Загрузка истории workflow...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflow-history-error">
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>
            <strong>Ошибка:</strong> {error}
            <button 
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={fetchWorkflowHistory}
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
    <div className="workflow-history">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">
          <i className="bi bi-clock-history me-2"></i>
          История переходов
        </h6>
        
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="includeDetails"
            checked={includeDetails}
            onChange={(e) => setIncludeDetails(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="includeDetails">
            Подробности
          </label>
        </div>
      </div>

      {history.length > 0 ? (
        <>
          <div className="history-timeline">
            {history.map((entry, index) => (
              <HistoryEntry
                key={entry.id}
                entry={entry}
                isLast={index === history.length - 1}
                includeDetails={includeDetails}
                formatDate={formatDate}
                formatDuration={formatDuration}
                getStatusDisplayName={getStatusDisplayName}
                getTransitionDisplayName={getTransitionDisplayName}
              />
            ))}
          </div>

          {/* Пагинация */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <nav>
                <ul className="pagination pagination-sm">
                  <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                    <li key={page} className={`page-item ${pagination.page === page ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </li>
                  ))}
                  
                  <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}

          <div className="text-muted text-center mt-2">
            <small>
              Показано {history.length} из {pagination.total} записей
            </small>
          </div>
        </>
      ) : (
        <div className="no-history">
          <div className="text-muted text-center py-3">
            <i className="bi bi-info-circle me-2"></i>
            История переходов пуста
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryEntry = ({ 
  entry, 
  isLast, 
  includeDetails, 
  formatDate, 
  formatDuration, 
  getStatusDisplayName, 
  getTransitionDisplayName 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusBadge = (status) => {
    if (!status) return null;
    
    return (
      <span 
        className="badge rounded-pill px-2 py-1"
        style={{ 
          backgroundColor: status.color || '#6c757d',
          color: '#fff',
          fontSize: '0.75rem'
        }}
      >
        {status.icon && (
          <i className={`bi bi-${status.icon} me-1`}></i>
        )}
        {getStatusDisplayName(status)}
      </span>
    );
  };

  const getTransitionBadge = (transition) => {
    if (!transition) return null;
    
    return (
      <span 
        className="badge bg-light text-dark px-2 py-1"
        style={{ fontSize: '0.75rem' }}
      >
        {transition.icon && (
          <i className={`bi bi-${transition.icon} me-1`}></i>
        )}
        {getTransitionDisplayName(transition)}
      </span>
    );
  };

  return (
    <div className={`history-entry ${!isLast ? 'border-bottom' : ''} pb-3 mb-3`}>
      <div className="d-flex">
        {/* Timeline indicator */}
        <div className="timeline-indicator me-3">
          <div 
            className={`timeline-dot ${entry.success ? 'bg-success' : 'bg-danger'}`}
            style={{ width: '12px', height: '12px', borderRadius: '50%' }}
          ></div>
          {!isLast && (
            <div 
              className="timeline-line bg-light"
              style={{ width: '2px', height: '100%', marginLeft: '5px', marginTop: '4px' }}
            ></div>
          )}
        </div>

        {/* Entry content */}
        <div className="flex-grow-1">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="entry-main">
              {/* Status transition */}
              <div className="status-transition mb-2">
                {entry.fromStatus && getStatusBadge(entry.fromStatus)}
                {entry.fromStatus && entry.toStatus && (
                  <i className="bi bi-arrow-right mx-2 text-muted"></i>
                )}
                {entry.toStatus && getStatusBadge(entry.toStatus)}
              </div>

              {/* Transition info */}
              {entry.transition && (
                <div className="transition-info mb-2">
                  {getTransitionBadge(entry.transition)}
                </div>
              )}

              {/* User and date */}
              <div className="entry-meta">
                <small className="text-muted">
                  {entry.user && (
                    <>
                      <i className="bi bi-person me-1"></i>
                      {entry.user.firstName} {entry.user.lastName}
                      <span className="mx-2">•</span>
                    </>
                  )}
                  <i className="bi bi-clock me-1"></i>
                  {formatDate(entry.createdAt)}
                  {entry.executionDuration && (
                    <>
                      <span className="mx-2">•</span>
                      <i className="bi bi-stopwatch me-1"></i>
                      {formatDuration(entry.executionDuration)}
                    </>
                  )}
                </small>
              </div>
            </div>

            {/* Status indicator */}
            <div className="entry-status">
              {entry.success ? (
                <i className="bi bi-check-circle-fill text-success"></i>
              ) : (
                <i className="bi bi-x-circle-fill text-danger"></i>
              )}
            </div>
          </div>

          {/* Error message */}
          {!entry.success && entry.errorMessage && (
            <div className="alert alert-danger alert-sm mb-2">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Ошибка:</strong> {entry.errorMessage}
            </div>
          )}

          {/* Details toggle */}
          {includeDetails && (entry.conditionsResult || entry.actionsResult || entry.metadata) && (
            <div className="entry-details">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowDetails(!showDetails)}
              >
                <i className={`bi bi-chevron-${showDetails ? 'up' : 'down'} me-1`}></i>
                {showDetails ? 'Скрыть детали' : 'Показать детали'}
              </button>

              {showDetails && (
                <div className="details-content mt-2 p-2 bg-light rounded">
                  {entry.conditionsResult && (
                    <div className="mb-2">
                      <strong>Условия:</strong>
                      <pre className="small mt-1 mb-0">
                        {JSON.stringify(entry.conditionsResult, null, 2)}
                      </pre>
                    </div>
                  )}

                  {entry.actionsResult && (
                    <div className="mb-2">
                      <strong>Действия:</strong>
                      <pre className="small mt-1 mb-0">
                        {JSON.stringify(entry.actionsResult, null, 2)}
                      </pre>
                    </div>
                  )}

                  {entry.metadata && (
                    <div className="mb-0">
                      <strong>Метаданные:</strong>
                      <pre className="small mt-1 mb-0">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowHistory;