import { getByPath, type CustomApiConfig, type EndpointConfig } from "./customApiConfig";
import type {
  AvailabilitySlot,
  BookingResult,
  DoctorSummary,
  EhrAdapter,
  PatientAppointmentSummary,
} from "./ehrAdapter";

/**
 * Generic REST adapter for a clinic that already runs its own booking
 * system — every request/response shape is driven entirely by the config
 * an admin fills in on the dashboard (base URL, auth, per-capability
 * endpoint + field mappings). No clinic-specific code lives here.
 */
export class CustomApiAdapter implements EhrAdapter {
  constructor(private readonly config: CustomApiConfig) {}

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const auth = this.config.auth;
    switch (auth.type) {
      case "API_KEY":
        headers[auth.headerName] = auth.apiKey;
        break;
      case "BEARER":
        headers.Authorization = `Bearer ${auth.token}`;
        break;
      case "BASIC":
        headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;
        break;
      case "NONE":
        break;
    }
    return headers;
  }

  private async callEndpoint(cfg: EndpointConfig, params: Record<string, unknown>): Promise<unknown> {
    const url = new URL(cfg.path, this.config.baseUrl);
    let body: string | undefined;
    if (cfg.method === "GET") {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) url.searchParams.set(key, String(value));
      }
    } else {
      body = JSON.stringify(params);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: cfg.method,
        headers: this.buildHeaders(),
        body,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new Error(
        `Could not reach the external booking system at ${this.config.baseUrl}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!response.ok) {
      throw new Error(`External booking system returned ${response.status} ${response.statusText} for ${cfg.path}`);
    }

    try {
      return await response.json();
    } catch {
      throw new Error(`External booking system returned a non-JSON response for ${cfg.path}`);
    }
  }

  private mapItem(item: unknown, mapping: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [ourField, theirPath] of Object.entries(mapping)) {
      result[ourField] = getByPath(item, theirPath);
    }
    return result;
  }

  private extractList(response: unknown, cfg: EndpointConfig): unknown[] {
    const listSource = cfg.listPath ? getByPath(response, cfg.listPath) : response;
    if (!Array.isArray(listSource)) {
      throw new Error(`Expected a list response from ${cfg.path} but got ${typeof listSource}`);
    }
    return listSource;
  }

  async listDoctors(params: { clinicId: string; departmentName?: string }): Promise<DoctorSummary[]> {
    const cfg = this.config.endpoints.listDoctors;
    const response = await this.callEndpoint(cfg, { departmentName: params.departmentName });
    return this.extractList(response, cfg).map((item) => {
      const mapped = this.mapItem(item, cfg.responseMapping);
      return {
        doctorId: String(mapped.doctorId ?? ""),
        doctorName: String(mapped.doctorName ?? ""),
        departmentName: mapped.departmentName != null ? String(mapped.departmentName) : null,
      };
    });
  }

  async getAvailability(params: {
    clinicId: string;
    doctorId?: string;
    departmentName?: string;
    from: Date;
    to: Date;
  }): Promise<AvailabilitySlot[]> {
    const cfg = this.config.endpoints.checkAvailability;
    const response = await this.callEndpoint(cfg, {
      doctorId: params.doctorId,
      departmentName: params.departmentName,
      from: params.from.toISOString(),
      to: params.to.toISOString(),
    });
    return this.extractList(response, cfg).map((item) => {
      const mapped = this.mapItem(item, cfg.responseMapping);
      return {
        slotId: String(mapped.slotId ?? ""),
        doctorId: String(mapped.doctorId ?? ""),
        doctorName: String(mapped.doctorName ?? ""),
        startsAt: new Date(String(mapped.startsAt)),
        endsAt: new Date(String(mapped.endsAt)),
      };
    });
  }

  async bookSlot(params: {
    clinicId: string;
    slotId: string;
    patientPhone: string;
    patientName: string;
  }): Promise<BookingResult> {
    const cfg = this.config.endpoints.bookSlot;
    const response = await this.callEndpoint(cfg, {
      slotId: params.slotId,
      patientPhone: params.patientPhone,
      patientName: params.patientName,
    });
    const mapped = this.mapItem(response, cfg.responseMapping);
    return {
      appointmentId: String(mapped.appointmentId ?? ""),
      doctorName: String(mapped.doctorName ?? ""),
      startsAt: new Date(String(mapped.startsAt)),
    };
  }

  async getPatientAppointments(params: {
    clinicId: string;
    patientPhone: string;
  }): Promise<PatientAppointmentSummary[]> {
    const cfg = this.config.endpoints.getPatientAppointments;
    const response = await this.callEndpoint(cfg, { patientPhone: params.patientPhone });
    return this.extractList(response, cfg).map((item) => {
      const mapped = this.mapItem(item, cfg.responseMapping);
      return {
        appointmentId: String(mapped.appointmentId ?? ""),
        doctorName: String(mapped.doctorName ?? ""),
        startsAt: new Date(String(mapped.startsAt)),
      };
    });
  }

  async cancelAppointment(params: { clinicId: string; appointmentId: string }): Promise<void> {
    const cfg = this.config.endpoints.cancelAppointment;
    await this.callEndpoint(cfg, { appointmentId: params.appointmentId });
  }

  /**
   * Admin "Test connection" support: calls a capability live with whatever
   * params the admin supplies and returns both the raw and field-mapped
   * response, so mappings can be sanity-checked before saving.
   */
  async testCapability(
    capability: keyof CustomApiConfig["endpoints"],
    params: Record<string, unknown>
  ): Promise<{ raw: unknown; mapped: unknown }> {
    const cfg = this.config.endpoints[capability];
    const raw = await this.callEndpoint(cfg, params);
    const isListCapability = capability !== "bookSlot" && capability !== "cancelAppointment";
    const mapped = isListCapability
      ? this.extractList(raw, cfg).map((item) => this.mapItem(item, cfg.responseMapping))
      : this.mapItem(raw, cfg.responseMapping);
    return { raw, mapped };
  }
}
