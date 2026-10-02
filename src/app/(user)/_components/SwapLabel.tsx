// 상태에 따라 바뀌는 버튼 글자. 두 글자를 같은 칸에 겹쳐 두고 하나만 보이게 해서,
// 버튼 폭이 항상 긴 쪽에 맞춰져 눌러도 변하지 않는다 (숨은 쪽은 visibility: hidden 이라 읽히지도 않는다)
export function SwapLabel({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span className="grid justify-items-center">
      <span className={`col-start-1 row-start-1 ${on ? "invisible" : ""}`}>{offText}</span>
      <span className={`col-start-1 row-start-1 ${on ? "" : "invisible"}`}>{onText}</span>
    </span>
  );
}
