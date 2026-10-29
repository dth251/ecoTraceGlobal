"""Giao diện demo luồng AI của EcoTrace.

    streamlit run app.py
"""
import json
import math
from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st

from app.config import settings
from app.demo.emission_calc import calculate
from app.factors import FACTOR_SCOPE
from app.pipeline import DocumentResult, InputDocument, finalize, process_document
from app.schemas import ActivityType, TransportMode

ROOT = Path(__file__).resolve().parent
SAMPLES = ROOT / "samples"
MIME = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg", ".webp": "image/webp"}
ACTIVITY_VI = {"ELECTRICITY": "Điện", "FUEL": "Nhiên liệu", "MATERIAL": "Nguyên liệu",
               "FREIGHT": "Vận chuyển", "OTHER": "Khác"}
PRIORITY_VI = {"HIGH": "Cao", "MEDIUM": "Vừa", "LOW": "Thấp"}
STATUS_VI = {"CALCULATED": "✅ Đã tính", "MISSING_DATA": "⚠️ Thiếu dữ liệu",
             "UNIT_MISMATCH": "⚠️ Sai đơn vị", "NO_FACTOR": "⚠️ Chưa có hệ số"}

st.set_page_config(page_title="EcoTrace AI", page_icon="🌿", layout="wide")


def activity_of(code: str) -> ActivityType:
    if code == "ELEC_GRID":
        return ActivityType.ELECTRICITY
    prefix = code.split("_")[0]
    return {"FUEL": ActivityType.FUEL, "MAT": ActivityType.MATERIAL,
            "FREIGHT": ActivityType.FREIGHT}.get(prefix, ActivityType.OTHER)


def clean(v):
    """NaN/chuỗi rỗng từ data_editor -> None."""
    if v is None or (isinstance(v, float) and math.isnan(v)) or v == "":
        return None
    return v


# ---------------- Sidebar ----------------
with st.sidebar:
    st.title("🌿 EcoTrace AI")
    st.caption("Demo luồng AI: chứng từ → trích xuất → phân loại → CO₂e → gợi ý")
    has_key = bool(settings.gemini_api_key)
    st.markdown(f"**Model:** `{settings.gemini_model}`")
    st.markdown("**API key:** " + ("✅ đã cấu hình" if has_key else "❌ thiếu (tự chạy mock)"))
    settings.mock_mode = st.toggle("Chế độ mock (không gọi Gemini)", value=settings.mock_mode or not has_key,
                                   disabled=not has_key)
    settings.cache_enabled = st.toggle("Dùng cache kết quả", value=settings.cache_enabled,
                                       help="Chứng từ đã xử lý sẽ lấy lại kết quả, không gọi Gemini lần nữa")
    language = st.radio("Ngôn ngữ gợi ý", ["vi", "en"], horizontal=True,
                        format_func=lambda x: "Tiếng Việt" if x == "vi" else "English")
    max_suggestions = st.slider("Số gợi ý tối đa", 1, 10, 5)
    st.divider()
    st.caption("Hệ số phát thải trong demo là giá trị tham khảo, không dùng cho báo cáo chính thức.")

# ---------------- Bước 1: chọn chứng từ ----------------
st.header("1. Chọn chứng từ")
c1, c2 = st.columns([2, 1])
with c1:
    uploads = st.file_uploader("Tải hóa đơn / vận đơn (PDF, PNG, JPG, WEBP)",
                               type=["pdf", "png", "jpg", "jpeg", "webp"], accept_multiple_files=True)
with c2:
    sample_files = sorted(p for p in SAMPLES.glob("*") if p.suffix.lower() in MIME) if SAMPLES.exists() else []
    use_samples = st.checkbox(f"Dùng {len(sample_files)} chứng từ mẫu", value=not uploads,
                              disabled=not sample_files)
    if mock := (settings.mock_mode or not has_key):
        doc_hint = st.selectbox("Loại tài liệu (mock)", list(ACTIVITY_VI)[:4], format_func=ACTIVITY_VI.get,
                                help="Ở chế độ mock, dữ liệu trả về theo loại được chọn")
    else:
        doc_hint = None

docs: list[InputDocument] = []
if use_samples:
    docs += [InputDocument(p.name, p.read_bytes(), MIME[p.suffix.lower()]) for p in sample_files]
for f in uploads or []:
    docs.append(InputDocument(f.name, f.getvalue(), f.type or MIME.get(Path(f.name).suffix.lower(), "")))
if mock:
    for d in docs:
        d.doc_type = doc_hint

if st.button(f"▶ Chạy luồng AI ({len(docs)} chứng từ)", type="primary", disabled=not docs):
    progress = st.progress(0.0, text="Đang xử lý...")
    results: list[DocumentResult] = []
    for i, d in enumerate(docs):
        progress.progress(i / len(docs), text=f"Đang đọc {d.name} ({i + 1}/{len(docs)})")
        results.append(process_document(d))
    progress.progress(1.0, text="Đang tổng hợp và sinh gợi ý...")
    st.session_state.result = finalize(results, language, max_suggestions)
    st.session_state.files = {d.name: (d.content, d.mime_type) for d in docs}
    progress.empty()

result = st.session_state.get("result")
if not result:
    st.info("Chọn chứng từ và bấm **Chạy luồng AI** để bắt đầu.")
    st.stop()

# ---------------- Bước 2: kết quả ----------------
inv = result.inventory
st.header("2. Kết quả")
k1, k2, k3, k4 = st.columns(4)
k1.metric("Tổng (tCO₂e)", f"{inv.total_co2e_kg / 1000:,.2f}")
k2.metric("Chứng từ đã tính", f"{inv.documents_calculated}/{len(result.documents)}")
k3.metric("Cần xem lại", inv.documents_need_review)
k4.metric("Lỗi", inv.documents_failed)

# Dùng segmented_control có key thay cho st.tabs: st.tabs nhảy về tab đầu mỗi lần sửa ô trong data_editor
VIEWS = ["📄 Chứng từ", "✏️ Xác nhận & chỉnh sửa", "📊 Inventory", "💡 Gợi ý tối ưu", "🧾 JSON"]
tab_docs, tab_review, tab_inv, tab_opt, tab_json = VIEWS
if st.session_state.get("view") is None:
    st.session_state.view = VIEWS[0]
view = st.segmented_control("Xem", VIEWS, key="view", label_visibility="collapsed") or VIEWS[0]

if view == tab_docs:
    rows = []
    for d in result.documents:
        if not d.ok:
            rows.append({"File": d.file, "Loại": "LỖI", "Ghi chú": d.error})
            continue
        x, e = d.extraction.data, d.emission
        rows.append({
            "File": d.file, "Loại": ACTIVITY_VI[x.activity_type.value], "Scope": x.scope,
            "Mã hệ số": x.factor_code, "Số lượng": x.quantity if x.quantity is not None else x.weight_kg,
            "Đơn vị": x.unit if x.quantity is not None else ("kg" if x.weight_kg else None),
            "CO₂e (kg)": e.co2e_kg, "Trạng thái": STATUS_VI.get(e.status, e.status),
            "Cần xem lại": ", ".join(x.review_fields) or "—", "Thời gian (ms)": d.elapsed_ms,
        })
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch",
                 column_config={"CO₂e (kg)": st.column_config.NumberColumn(format="%.1f")})

    for d in result.documents:
        if not d.ok:
            continue
        x, e = d.extraction.data, d.emission
        icon = "⚠️" if x.needs_review else "✅"
        with st.expander(f"{icon} {d.file} — {ACTIVITY_VI[x.activity_type.value]}, Scope {x.scope}"):
            left, right = st.columns([1, 1])
            with left:
                content, mime = st.session_state.files.get(d.file, (None, None))
                if content and mime and mime.startswith("image/"):
                    st.image(content, width="stretch")
                else:
                    st.caption("File PDF — không hiển thị xem trước.")
            with right:
                fields = {k: v for k, v in x.model_dump(mode="json").items()
                          if v not in (None, [], {}) and k not in ("confidence", "review_fields", "needs_review")}
                st.markdown("**Dữ liệu AI trích xuất**")
                st.table(pd.DataFrame(
                    [{"Trường": k, "Giá trị": str(v),
                      "Tin cậy": f"{x.confidence[k]:.0%}" if k in x.confidence else "",
                      "Xem lại": "⚠️" if k in x.review_fields else ""} for k, v in fields.items()]
                ))
                if x.review_fields:
                    st.warning("Cần xác nhận: " + ", ".join(x.review_fields))
                st.markdown("**Tính CO₂e (demo)**")
                if e.formula:
                    st.code(e.formula, language=None)
                st.caption(f"Hệ số: {e.factor_value} kg CO₂e/{e.factor_unit} — {e.factor_source}"
                           + (f" · {e.note}" if e.note else ""))

if view == tab_review:
    st.caption("Mô phỏng trang `/documents/:id`: người dùng sửa dữ liệu AI đọc sai, sau đó hệ thống tính lại. "
               "Vận chuyển dùng Khối lượng × Quãng đường; các loại khác dùng Số lượng.")
    ok_docs = [d for d in result.documents if d.ok]
    edit_df = pd.DataFrame([{
        "File": d.file, "Cần xem lại": ", ".join(d.extraction.data.review_fields) or "—",
        "Mã hệ số": d.extraction.data.factor_code,
        "Số lượng": d.extraction.data.quantity, "Đơn vị": d.extraction.data.unit,
        "Khối lượng (kg)": d.extraction.data.weight_kg,
        "Quãng đường (km)": d.extraction.data.distance_km or (d.emission.distance_km_used if d.emission else None),
        "Ngày": d.extraction.data.invoice_date,
        "Nơi đi": d.extraction.data.origin, "Nơi đến": d.extraction.data.destination,
    } for d in ok_docs])
    edited = st.data_editor(
        edit_df, hide_index=True, width="stretch", key="editor",
        disabled=["File", "Cần xem lại"],
        column_config={
            "Mã hệ số": st.column_config.SelectboxColumn(options=list(FACTOR_SCOPE), required=True),
            "Đơn vị": st.column_config.SelectboxColumn(options=["kWh", "L", "kg", "m3"]),
        },
    )
    if st.button("✔ Xác nhận và tính lại", type="primary"):
        new_results = []
        by_file = {r["File"]: r for r in edited.to_dict("records")}
        for d in result.documents:
            if not d.ok:
                new_results.append(d)
                continue
            r = by_file[d.file]
            code = clean(r["Mã hệ số"])
            act = activity_of(code) if code else d.extraction.data.activity_type
            data = d.extraction.data.model_copy(update={
                "factor_code": code, "scope": FACTOR_SCOPE.get(code), "activity_type": act,
                "invoice_date": clean(r["Ngày"]), "quantity": clean(r["Số lượng"]), "unit": clean(r["Đơn vị"]),
                "weight_kg": clean(r["Khối lượng (kg)"]), "distance_km": clean(r["Quãng đường (km)"]),
                "origin": clean(r["Nơi đi"]), "destination": clean(r["Nơi đến"]),
                "transport_mode": (TransportMode(code.split("_")[1]) if act == ActivityType.FREIGHT and code
                                   else d.extraction.data.transport_mode),
                "needs_review": False, "review_fields": [],  # người dùng đã xác nhận
            })
            ext = d.extraction.model_copy(update={"data": data, "status": "OK"})
            new_results.append(d.model_copy(update={"extraction": ext, "emission": calculate(data)}))
        with st.spinner("Đang tính lại và sinh gợi ý..."):
            st.session_state.result = finalize(new_results, language, max_suggestions)
        st.rerun()

if view == tab_inv:
    if inv.total_co2e_kg <= 0:
        st.info("Chưa có chứng từ nào tính được CO₂e.")
    else:
        scope_df = pd.DataFrame([{"Scope": f"Scope {s}", "kg CO₂e": v} for s, v in inv.by_scope.items() if v > 0])
        factor_df = pd.DataFrame([{"Nguồn": k, "kg CO₂e": v} for k, v in inv.by_factor.items()])
        c1, c2 = st.columns(2)
        with c1:
            st.subheader("Tỷ trọng theo Scope")
            st.altair_chart(
                alt.Chart(scope_df).mark_arc(innerRadius=70).encode(
                    theta="kg CO₂e:Q",
                    color=alt.Color("Scope:N", scale=alt.Scale(range=["#e07a5f", "#3d85c6", "#2a9d8f"])),
                    tooltip=["Scope", alt.Tooltip("kg CO₂e:Q", format=",.1f")],
                ).properties(height=300),
                width="stretch",
            )
        with c2:
            st.subheader("Theo nguồn phát thải")
            st.altair_chart(
                alt.Chart(factor_df).mark_bar(color="#2a9d8f").encode(
                    x=alt.X("kg CO₂e:Q"), y=alt.Y("Nguồn:N", sort="-x"),
                    tooltip=["Nguồn", alt.Tooltip("kg CO₂e:Q", format=",.1f")],
                ).properties(height=300),
                width="stretch",
            )
        if inv.monthly:
            st.subheader("Theo tháng")
            st.altair_chart(
                alt.Chart(pd.DataFrame([m.model_dump() for m in inv.monthly])).mark_bar(color="#3d85c6").encode(
                    x=alt.X("month:N", title="Tháng", axis=alt.Axis(labelAngle=0)), y=alt.Y("co2e_kg:Q", title="kg CO₂e"),
                    tooltip=["month", alt.Tooltip("co2e_kg:Q", format=",.1f")],
                ).properties(height=250),
                width="stretch",
            )
        st.dataframe(pd.DataFrame([{"Scope": f"Scope {s}", "kg CO₂e": round(v, 1),
                                    "Tỷ trọng": f"{v / inv.total_co2e_kg:.1%}"} for s, v in inv.by_scope.items()]),
                     hide_index=True)

if view == tab_opt:
    opt = result.optimization
    st.caption(("⚙️ Văn bản mặc định (mock)" if opt.mock else "🤖 Văn bản do Gemini viết")
               + " · Số liệu giảm phát thải và chi phí do quy tắc tính, không do LLM tạo.")
    if not opt.suggestions:
        st.info("Chưa có gợi ý.")
    for i, s in enumerate(opt.suggestions, 1):
        with st.container(border=True):
            st.markdown(f"#### {i}. {s.title}")
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Giảm (kg CO₂e)", f"{s.estimated_reduction_kg:,.0f}")
            m2.metric("% tổng", f"{s.estimated_reduction_pct}%")
            m3.metric("Chi phí (USD)", f"{s.estimated_cost_usd:,.0f}")
            m4.metric("Ưu tiên", PRIORITY_VI.get(s.priority, s.priority))
            st.write(s.rationale)
            st.caption(f"Căn cứ: {s.evidence}")
            st.markdown("**Các bước:**\n" + "\n".join(f"{j}. {step}" for j, step in enumerate(s.steps, 1)))

if view == tab_json:
    payload = json.dumps(result.model_dump(mode="json"), ensure_ascii=False, indent=2)
    st.download_button("⬇ Tải kết quả JSON", payload, file_name="ecotrace_ai_result.json", mime="application/json")
    st.json(result.model_dump(mode="json"), expanded=False)
