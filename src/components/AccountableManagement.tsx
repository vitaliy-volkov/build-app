import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Calendar, FileText, Plus, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, Search, Filter, Download, Eye
} from 'lucide-react';
import { 
  Transaction, 
  TransactionStatus, 
  OperationType, 
  CounterpartyType,
  CashAccount,
  Counterparty,
  Project
} from '../types';
import { AccountabilityModal } from './AccountabilityModal';

interface AccountableManagementProps {
  transactions: Transaction[];
  counterparties: Counterparty[];
  cashAccounts: CashAccount[];
  projects: Project[];
  currentUser: any;
  addTransaction: (transaction: Transaction) => void;
}

interface EmployeeBalance {
  employee: Counterparty;
  issued: number;
  returned: number;
  balance: number;
  lastTransaction?: Transaction;
  transactions: Transaction[];
}

export const AccountableManagement: React.FC<AccountableManagementProps> = ({
  transactions,
  counterparties,
  cashAccounts,
  projects,
  currentUser,
  addTransaction
}) => {
  const [showAccountabilityModal, setShowAccountabilityModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'hasDebt' | 'noDebt'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeBalances, setEmployeeBalances] = useState<EmployeeBalance[]>([]);

  // Расчет балансов сотрудников
  useEffect(() => {
    const employees = counterparties.filter(cp => cp.type === CounterpartyType.Employee);
    
    const balances = employees.map(employee => {
      const employeeTransactions = transactions.filter(t => t.accountable_person_id === employee.id);
      
      const issued = employeeTransactions
        .filter(t => t.operation_type === OperationType.AccountabilityIssue)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const returned = employeeTransactions
        .filter(t => t.operation_type === OperationType.AccountabilityReturn || 
                     (t.operation_type === OperationType.Expense && t.accountable_person_id))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const balance = issued - returned;
      
      return {
        employee,
        issued,
        returned,
        balance,
        lastTransaction: employeeTransactions.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0],
        transactions: employeeTransactions
      };
    });
    
    setEmployeeBalances(balances);
  }, [transactions, counterparties]);

  // Фильтрация сотрудников
  const filteredEmployees = employeeBalances.filter(empBalance => {
    const matchesSearch = empBalance.employee.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'hasDebt' && empBalance.balance > 0) ||
      (filterStatus === 'noDebt' && empBalance.balance <= 0);
    
    return matchesSearch && matchesFilter;
  });

  // Статистика
  const totalIssued = employeeBalances.reduce((sum, emp) => sum + emp.issued, 0);
  const totalReturned = employeeBalances.reduce((sum, emp) => sum + emp.returned, 0);
  const totalOutstanding = employeeBalances.reduce((sum, emp) => sum + Math.max(0, emp.balance), 0);
  const employeesWithDebt = employeeBalances.filter(emp => emp.balance > 0).length;

  const selectedEmployeeData = selectedEmployee 
    ? employeeBalances.find(emp => emp.employee.id === selectedEmployee)
    : null;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Управление подотчетными</h3>
            <p className="text-sm text-slate-500">Выдача, контроль и возврат подотчетных средств</p>
          </div>
          <button
            onClick={() => setShowAccountabilityModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            Выдать подотчетность
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Всего выдано</span>
              <DollarSign size={16} className="text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-800">
              {totalIssued.toLocaleString()} ₽
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Возвращено</span>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <div className="text-xl font-bold text-green-600">
              {totalReturned.toLocaleString()} ₽
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Невозвращено</span>
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <div className="text-xl font-bold text-red-600">
              {totalOutstanding.toLocaleString()} ₽
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Должники</span>
              <Users size={16} className="text-orange-500" />
            </div>
            <div className="text-xl font-bold text-orange-600">
              {employeesWithDebt} чел.
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                className="w-full p-2 pl-9 border border-slate-300 rounded-lg"
                placeholder="Поиск по ФИО сотрудника..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-2 rounded-lg text-sm ${
                filterStatus === 'all' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterStatus('hasDebt')}
              className={`px-3 py-2 rounded-lg text-sm ${
                filterStatus === 'hasDebt' 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              С долгом
            </button>
            <button
              onClick={() => setFilterStatus('noDebt')}
              className={`px-3 py-2 rounded-lg text-sm ${
                filterStatus === 'noDebt' 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Без долга
            </button>
          </div>
        </div>
      </div>

      {/* Таблица сотрудников */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h4 className="font-medium text-slate-800">Балансы сотрудников</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-sm">
              <tr>
                <th className="text-left p-3 font-medium">Сотрудник</th>
                <th className="text-right p-3 font-medium">Выдано</th>
                <th className="text-right p-3 font-medium">Возвращено</th>
                <th className="text-right p-3 font-medium">Баланс</th>
                <th className="text-left p-3 font-medium">Последняя операция</th>
                <th className="text-center p-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((empBalance, index) => (
                <tr key={empBalance.employee.id} className={`border-t border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-slate-800">{empBalance.employee.full_name}</div>
                      <div className="text-sm text-slate-500">{empBalance.employee.role || 'Сотрудник'}</div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-blue-600 font-medium">
                      {empBalance.issued.toLocaleString()} ₽
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-green-600 font-medium">
                      {empBalance.returned.toLocaleString()} ₽
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-bold ${
                      empBalance.balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {empBalance.balance.toLocaleString()} ₽
                    </span>
                  </td>
                  <td className="p-3">
                    {empBalance.lastTransaction ? (
                      <div>
                        <div className="text-sm text-slate-600">
                          {new Date(empBalance.lastTransaction.date).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {empBalance.lastTransaction.operation_type === OperationType.AccountabilityIssue ? 'Выдача' : 'Возврат'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Нет операций</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedEmployee(empBalance.employee.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Сотрудники не найдены' 
                      : 'Нет сотрудников для отображения'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Детальная информация по сотруднику */}
      {selectedEmployeeData && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-medium text-slate-800">
              История операций: {selectedEmployeeData.employee.full_name}
            </h4>
            <button
              onClick={() => setSelectedEmployee(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {selectedEmployeeData.issued.toLocaleString()} ₽
                </div>
                <div className="text-sm text-slate-500">Выдано</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {selectedEmployeeData.returned.toLocaleString()} ₽
                </div>
                <div className="text-sm text-slate-500">Возвращено</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {selectedEmployeeData.balance.toLocaleString()} ₽
                </div>
                <div className="text-sm text-slate-500">Текущий баланс</div>
              </div>
            </div>
            
            <div className="space-y-2">
              {selectedEmployeeData.transactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${
                        transaction.operation_type === OperationType.AccountabilityIssue 
                          ? 'bg-blue-100' 
                          : 'bg-green-100'
                      }`}>
                        {transaction.operation_type === OperationType.AccountabilityIssue ? (
                          <TrendingDown size={16} className="text-blue-600" />
                        ) : (
                          <TrendingUp size={16} className="text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">
                          {transaction.operation_type === OperationType.AccountabilityIssue ? 'Выдача' : 'Возврат'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {new Date(transaction.date).toLocaleDateString('ru-RU')}
                        </div>
                        {transaction.description && (
                          <div className="text-sm text-slate-600">{transaction.description}</div>
                        )}
                      </div>
                    </div>
                    <div className={`font-bold ${
                      transaction.operation_type === OperationType.AccountabilityIssue 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {transaction.operation_type === OperationType.AccountabilityIssue ? '-' : '+'}
                      {transaction.amount.toLocaleString()} ₽
                    </div>
                  </div>
                ))}
              
              {selectedEmployeeData.transactions.length === 0 && (
                <div className="text-center text-slate-400 py-4">
                  Нет операций по сотруднику
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выдачи подотчетности */}
      <AccountabilityModal
        isOpen={showAccountabilityModal}
        onClose={() => setShowAccountabilityModal(false)}
        onSave={(transaction) => {
          addTransaction(transaction);
          setShowAccountabilityModal(false);
        }}
        context={{
          currentUser,
          counterparties,
          cashAccounts,
          projects,
          transactions,
          aiConfig: null
        }}
      />
    </div>
  );
};
