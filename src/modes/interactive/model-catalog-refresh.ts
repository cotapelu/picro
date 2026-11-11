// ModelCatalogRefresh - gộp các lần làm mới danh mục mô hình đồng thời
// Bắt chước nguyên tắc pi-mono model-catalog-refresh.ts:
//   - Một runtime chỉ có một refresh đang chạy; người gọi sau chờ kết quả đó
//   - Hủy độc lập: mỗi người gọi giữ AbortSignal riêng
//   - Khi không còn ai chờ, refresh dùng chung bị hủy
// Port sang TSX riêng, khon copy code truc iep.

export interface ModelsRefreshResult {
  aborted: boolean;
  errors: Map<string, unknown>;
}

/** Phần runtime cần dùng. */
export type ModelCatalogRuntime = {
  refresh(options: { signal: AbortSignal }): Promise<ModelsRefreshResult>;
};

interface ActiveRefresh {
  controller: AbortController;
  promise: Promise<ModelsRefreshResult>;
  waiters: number;
}

/** Đua promise với AbortSignal để hủy độc lập. */
function raceWithAbortSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

class ModelCatalogRefreshCoordinator {
  private readonly activeByRuntime = new WeakMap<ModelCatalogRuntime, ActiveRefresh>();

  refresh(runtime: ModelCatalogRuntime, signal: AbortSignal): Promise<ModelsRefreshResult> {
    signal.throwIfAborted();
    let active = this.activeByRuntime.get(runtime);
    if (!active) {
      const controller = new AbortController();
      let created!: ActiveRefresh;
      const operation = runtime.refresh({ signal: controller.signal });
      const promise = raceWithAbortSignal(operation, controller.signal).finally(() => {
        if (this.activeByRuntime.get(runtime) === created) this.activeByRuntime.delete(runtime);
      });
      created = { controller, promise, waiters: 0 };
      active = created;
      this.activeByRuntime.set(runtime, active);
    }

    active.waiters++;
    return raceWithAbortSignal(active.promise, signal).finally(() => {
      active.waiters--;
      if (active.waiters === 0 && this.activeByRuntime.get(runtime) === active) {
        active.controller.abort();
      }
    });
  }
}

const coordinator = new ModelCatalogRefreshCoordinator();

/** Chia sẻ các lần làm mới danh mục đang chạy, giữ hủy độc lập cho từng người gọi. */
export function refreshModelCatalogs(
  runtime: ModelCatalogRuntime,
  signal: AbortSignal,
): Promise<ModelsRefreshResult> {
  return coordinator.refresh(runtime, signal);
}
