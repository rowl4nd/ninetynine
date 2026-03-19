{step === 3 && (
        <div>
          {svc?.addon ? (
            /* This is the ADDON selection UI */
            <div>
              <H3>Add an extra?</H3>
              <div 
                className={"nn-svc-item" + (addon ? " selected" : "")} 
                onClick={() => { setAddon(svc.addon); setStep(4); }}
              >
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:400, fontSize:15 }}>{svc.addon.name}</div>
                  <div style={{ fontSize:12, color:"var(--warm-gray)" }}>+{svc.addon.duration} mins · +£{svc.addon.price}</div>
                </div>
              </div>
              <div className="nn-booking-nav">
                <button className="nn-btn-back" onClick={() => setStep(2)}>Back</button>
                <button className="nn-btn nn-btn-outline" onClick={() => { setAddon(null); setStep(4); }}>Skip</button>
              </div>
            </div>
          ) : (
            /* If NO addon, this step IS the Date selection - trigger redirect or render calendar */
            <div style={{ display: 'none' }}>{setStep(4)}</div> 
          )}
        </div>
      )}
