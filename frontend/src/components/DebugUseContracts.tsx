import React from 'react';
import { useContracts } from '../hooks';

export default function DebugUseContracts() {
  const contractsHookResult = useContracts();
  
  console.log('useContracts hook result:', contractsHookResult);
  console.log('updateContract function:', contractsHookResult.updateContract);
  console.log('updateContract type:', typeof contractsHookResult.updateContract);
  
  return (
    <div>
      <h1>Debug useContracts Hook</h1>
      <p>Check console for debug info</p>
      <p>updateContract exists: {contractsHookResult.updateContract ? 'YES' : 'NO'}</p>
      <p>updateContract type: {typeof contractsHookResult.updateContract}</p>
    </div>
  );
}