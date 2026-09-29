# 需求索引

共 89 条正式需求，按分类列出。

## Gameplay（23 条）

- [REQ-GAME-001](REQ-GAME-001) — 直杠、补杠、暗杠后从牌墙补1张牌（正序或倒序按配置）。
- [REQ-GAME-002](REQ-GAME-002) — 碰牌当回合不可补杠，须过手后可补杠；及时雨开关控制补杠分是否计取。
- [REQ-GAME-003](REQ-GAME-003) — A杠后补牌再打出点炮给B（杠上炮）时触发呼叫转移。
- [REQ-GAME-004](REQ-GAME-004) — A打牌致B直杠时触发擦挂机制。
- [REQ-GAME-005](REQ-GAME-005) — 三房模式须声明缺门花色，禁用且不可更改，不可碰杠，胡牌不可含缺门花色。
- [REQ-GAME-006](REQ-GAME-006) — 必须打缺牌开关默认开、三房生效两房灰掉，手牌有缺门花色时须先打缺门牌。
- [REQ-GAME-007](REQ-GAME-007) — 本玩法不可吃牌为硬约束，行牌阶段不提供吃牌操作。
- [REQ-GAME-008](REQ-GAME-008) — 行牌操作优先级：胡牌高于碰/杠，高优先级先执行。
- [REQ-GAME-009](REQ-GAME-009) — 轮到自己摸1张牌，提牌后出牌进入响应窗；A出牌后B摸牌同时开始。
- [REQ-GAME-010](REQ-GAME-010) — 他人出牌后手牌有至少2张同牌可碰，碰后副露加1组并轮到自己出牌。
- [REQ-GAME-011](REQ-GAME-011) — 自摸或响应他人出牌满足牌型、缺门、限制层全部通过时可胡并进入结算。
- [REQ-GAME-012](REQ-GAME-012) — 响应他人出牌时选择过，放弃此次响应机会，过手规则生效。
- [REQ-GAME-013](REQ-GAME-013) — 过手碰默认开：A可碰未碰后A摸牌或杠牌前，B不可再碰同一张可碰牌。
- [REQ-GAME-014](REQ-GAME-014) — 过手胡默认开，可胡不胡后过手前不可再胡所有可胡牌；过手加番可胡默认开且依赖过手胡。
- [REQ-GAME-015](REQ-GAME-015) — 一人胡牌后游戏不结束，直至仅剩1人未胡（正常结算）或牌墙摸完（流局）。
- [REQ-GAME-016](REQ-GAME-016) — 后四张必胡开关默认关；牌墙不大于4张必须胡，不显示过，强制触发海底捞月×2。
- [REQ-GAME-017](REQ-GAME-017) — 2倍起胡开关默认关；倍数小于2不可胡，仍可听牌且流局不被查大叫。
- [REQ-GAME-018](REQ-GAME-018) — 死叫不算叫开关默认关；听口全在牌河或副露中不算听牌，流局被查大叫。
- [REQ-GAME-019](REQ-GAME-019) — 胡牌两层判定：番型合法性（缺门、基础番型、互斥取最高）+ 胡牌类型合法性（限制层+胡牌方式）。
- [REQ-GAME-020](REQ-GAME-020) — 一炮多响开关v1默认关；关闭按逆时针优先级仅一人胡，开启多家同胡各付1倍，不触发呼叫转移。
- [REQ-GAME-021](REQ-GAME-021) — 牌墙摸完无人胡牌（或剩余未胡均无法胡）触发流局，与正常结算区分。
- [REQ-GAME-022](REQ-GAME-022) — 流局时未胡且手牌仍含缺门花色判定为花猪；两房模式花猪判定失效。
- [REQ-GAME-023](REQ-GAME-023) — 流局时未胡且未听牌（花猪除外）玩家向听牌玩家按最大可能倍数赔付。

## Settlement（45 条）

- [REQ-SETTLEMENT-001](REQ-SETTLEMENT-001) — 直杠（刮风）：他人打第4张手上已有3张可直杠，补1张，收2倍底分由放杠者赔付。
- [REQ-SETTLEMENT-002](REQ-SETTLEMENT-002) — 补杠（刮风）：碰后再摸第4张可补杠，补1张，收1倍底分由所有未胡玩家均摊。
- [REQ-SETTLEMENT-003](REQ-SETTLEMENT-003) — 暗杠（下雨）：手中4张可暗杠，补1张，收2倍底分由所有未胡玩家均摊。
- [REQ-SETTLEMENT-004](REQ-SETTLEMENT-004) — 补杠被抢杠胡时该次补杠不结算杠分，胡牌按点炮类叠加抢杠胡×2。
- [REQ-SETTLEMENT-005](REQ-SETTLEMENT-005) — 直杠、补杠、暗杠杠分独立结算，不参与封顶倍数截断。
- [REQ-SETTLEMENT-006](REQ-SETTLEMENT-006) — 杠后补牌导致胡牌（杠上开花）视为自摸类，收所有未胡各1倍含自摸加倍。
- [REQ-SETTLEMENT-007](REQ-SETTLEMENT-007) — 呼叫转移触发时A将该次杠分转交胡牌者B。
- [REQ-SETTLEMENT-008](REQ-SETTLEMENT-008) — 结算流水线第5步套用赔付方向时，杠上炮（非一炮多响）触发呼叫转移转交杠分。
- [REQ-SETTLEMENT-009](REQ-SETTLEMENT-009) — 呼叫转移转交的杠分不参与封顶截断，按杠分独立结算。
- [REQ-SETTLEMENT-010](REQ-SETTLEMENT-010) — 杠上炮触发一炮多响时不触发呼叫转移，杠分不转交。
- [REQ-SETTLEMENT-011](REQ-SETTLEMENT-011) — 擦挂触发时B额外收A之外其他未胡玩家各1倍底分。
- [REQ-SETTLEMENT-012](REQ-SETTLEMENT-012) — 擦挂收取的1倍底分为固定值，不参与封顶截断。
- [REQ-SETTLEMENT-013](REQ-SETTLEMENT-013) — 杠上炮触发呼叫转移时，擦挂所得分数也一并转交胡牌者。
- [REQ-SETTLEMENT-014](REQ-SETTLEMENT-014) — 杠上炮作为加倍项×2，进入结算倍数链。
- [REQ-SETTLEMENT-015](REQ-SETTLEMENT-015) — F01平胡：固定×1，4面子+1将，含顺子、有缺门、非全刻子、非全同花色。
- [REQ-SETTLEMENT-016](REQ-SETTLEMENT-016) — F02对对胡：可配×2或×4，4副全刻子/杠加1将。
- [REQ-SETTLEMENT-017](REQ-SETTLEMENT-017) — F03七对：固定×4，7对子无四张相同，非全2/5/8，自动触发。
- [REQ-SETTLEMENT-018](REQ-SETTLEMENT-018) — F04将七对：固定×16，7对子且全由2/5/8组成，自带1根，有开关。
- [REQ-SETTLEMENT-019](REQ-SETTLEMENT-019) — F05一条龙：固定×4，同花色123/456/789三组顺子，有开关。
- [REQ-SETTLEMENT-020](REQ-SETTLEMENT-020) — F06金钩钓：固定×4，13张全副露+单吊，自动触发，与碰碰胡互斥。
- [REQ-SETTLEMENT-021](REQ-SETTLEMENT-021) — F07将对：固定×8，全由2/5/8组成的碰碰胡，有开关。
- [REQ-SETTLEMENT-022](REQ-SETTLEMENT-022) — F08将金钩钓：固定×16，全由2/5/8组成的金钩钓，自动触发。
- [REQ-SETTLEMENT-023](REQ-SETTLEMENT-023) — F09天胡：独立×32，庄家起手14张胡，不叠加不计自摸加倍，有开关。
- [REQ-SETTLEMENT-024](REQ-SETTLEMENT-024) — F10地胡：独立×32，闲家首摸即胡且全局无碰杠，有开关，庄点可地胡默认开。
- [REQ-SETTLEMENT-025](REQ-SETTLEMENT-025) — F11全幺九：可配×4或×8，每副面子加对子至少含1张1或9，有开关，与中张/断幺九互斥。
- [REQ-SETTLEMENT-026](REQ-SETTLEMENT-026) — F12清一色：叠加番型固定×4，全同花色触发，可与所有基础番型叠加，自动触发。
- [REQ-SETTLEMENT-027](REQ-SETTLEMENT-027) — F01至F11共11种基础番型互斥取最高不叠加；金钩钓/将对与碰碰胡、中张与全幺九结构互斥。
- [REQ-SETTLEMENT-028](REQ-SETTLEMENT-028) — 门清加倍项×2可与七对系叠加（川麻规则），暗杠仍算门清。
- [REQ-SETTLEMENT-029](REQ-SETTLEMENT-029) — 根指4张相同牌每根×2，自带根全部参与；龙七对等自带1根，十八罗汉自带4根。
- [REQ-SETTLEMENT-030](REQ-SETTLEMENT-030) — 天胡/地胡命中即独立32倍，不与任何番型、加倍项叠加，跳过乘法链套用自摸类赔付。
- [REQ-SETTLEMENT-031](REQ-SETTLEMENT-031) — 13种加倍项列表及叠加关系：自摸、杠上花、杠上炮、抢杠胡、清一色、门清、海底捞月、海底炮、夹心五、绝张、卡二条、中张、根。
- [REQ-SETTLEMENT-032](REQ-SETTLEMENT-032) — 结算主公式：底分×基础牌型倍数×可叠加牌型倍数×加倍项倍数；胡牌类型只决定赔付方向。
- [REQ-SETTLEMENT-033](REQ-SETTLEMENT-033) — 封顶倍数配置（默认32）与截断作用域；杠分、查花猪、退税、呼叫转移、擦挂不参与，查大叫参与。
- [REQ-SETTLEMENT-034](REQ-SETTLEMENT-034) — 天胡/地胡32倍独立，不计自摸加倍（即使勾选自摸加倍）。
- [REQ-SETTLEMENT-035](REQ-SETTLEMENT-035) — 自摸类（自摸/杠上花/海底捞月）赔付方向：收所有未胡各1倍含自摸加倍。
- [REQ-SETTLEMENT-036](REQ-SETTLEMENT-036) — 点炮类（点炮/抢杠胡/杠上炮/海底炮）赔付方向：放杠者单独付1倍不含自摸加倍。
- [REQ-SETTLEMENT-037](REQ-SETTLEMENT-037) — 六步结算流水线：基础番型→叠加牌型→加倍项→封顶→赔付方向→小结算。
- [REQ-SETTLEMENT-038](REQ-SETTLEMENT-038) — 流局处理固定顺序：退税→查花猪→查大叫，严格有序不可交换。
- [REQ-SETTLEMENT-039](REQ-SETTLEMENT-039) — 退税：未听牌玩家退回本局全部杠分，不算倍数不参与封顶。
- [REQ-SETTLEMENT-040](REQ-SETTLEMENT-040) — 退税不退回已通过呼叫转移给出去的杠分，仅退当前持有杠分。
- [REQ-SETTLEMENT-041](REQ-SETTLEMENT-041) — 查花猪赔付：花猪玩家向非花猪玩家赔付封顶倍数对应分数。
- [REQ-SETTLEMENT-042](REQ-SETTLEMENT-042) — 查花猪赔付金额即封顶倍数本身，不参与封顶截断。
- [REQ-SETTLEMENT-043](REQ-SETTLEMENT-043) — 功夫设置下已胡牌玩家不参与查花猪赔付。
- [REQ-SETTLEMENT-044](REQ-SETTLEMENT-044) — 查大叫赔付参与封顶截断，超过底分乘封顶倍数时截断。
- [REQ-SETTLEMENT-045](REQ-SETTLEMENT-045) — 查大叫不计加倍项：绝张、抢杠胡、杠上花、杠上炮、海底捞月、海底炮。

## Config（16 条）

- [REQ-CONFIG-001](REQ-CONFIG-001) — 点杠花三选一（当点炮/当自摸多人默认/当自摸单人），B连杠后自摸不算点杠花。
- [REQ-CONFIG-002](REQ-CONFIG-002) — 呼叫转移开关：4人默认开可关、3/2人灰掉；杠分转交含擦挂，不参与封顶。
- [REQ-CONFIG-003](REQ-CONFIG-003) — 擦挂开关：4人默认开、3人默认关、2人灰掉；B额收其他未胡各1倍，不参与封顶。
- [REQ-CONFIG-004](REQ-CONFIG-004) — 自摸三选一：自摸加倍×2（默认）/自摸加底+1/自摸不加，2/3/4人局均可选。
- [REQ-CONFIG-005](REQ-CONFIG-005) — 查大叫方式可配当点炮或当自摸，影响是否含自摸加倍。
- [REQ-CONFIG-006](REQ-CONFIG-006) — 查大叫范围可配全赔（含已胡）或不全赔（仅听牌未胡），默认不全赔。
- [REQ-CONFIG-007](REQ-CONFIG-007) — 人数配置2/3/4人，4人局为默认基准。
- [REQ-CONFIG-008](REQ-CONFIG-008) — 座位随人数联动：4人逆时针、3人房主下家加上家、2人房主对家。
- [REQ-CONFIG-009](REQ-CONFIG-009) — 换牌方向随人数联动：4人按骰子、3人按对家随机顺逆、2人恒对家。
- [REQ-CONFIG-010](REQ-CONFIG-010) — 房数配置三房/两房，默认4人三房108张，3/2人自动两房72张；联动定缺、必须打缺、花猪判定。
- [REQ-CONFIG-011](REQ-CONFIG-011) — 局数配置8/12/16/24局，默认8局，末局后大结算汇总排名。
- [REQ-CONFIG-012](REQ-CONFIG-012) — 底分配置1/2/5，默认2，作为结算与封顶基础乘数。
- [REQ-CONFIG-013](REQ-CONFIG-013) — 换张模式不换张/换3张默认/换4张；不换张跳过进入定缺，换4张方向不变。
- [REQ-CONFIG-014](REQ-CONFIG-014) — 定庄方式随机/房主，默认房主庄，决定首局庄家。
- [REQ-CONFIG-015](REQ-CONFIG-015) — 轮庄方式赢家坐庄默认/逆时针轮庄/流局连庄，含流局连庄子项。
- [REQ-CONFIG-016](REQ-CONFIG-016) — 番型开关体系：对对胡（含倍数下拉）、将对、将七对、一条龙、天地胡、海底捞月、海底炮、断幺九、门清、夹心五、绝张。

## UI（5 条）

- [REQ-UI-001](REQ-UI-001) — 暗杠展示为3张牌背加1张牌面。
- [REQ-UI-002](REQ-UI-002) — 向听数等于1显示听牌提示标签，优先级优>大>多>箭头。
- [REQ-UI-003](REQ-UI-003) — 多操作状态按钮：可多杠显示选择框加杠加过；碰杠胡或自摸过，有自摸不可直接出牌。
- [REQ-UI-004](REQ-UI-004) — 9种叠加番型名（S01-S09）仅显示不产生倍数，倍数随下拉动态调整。
- [REQ-UI-005](REQ-UI-005) — 小结算输出番型名称、流水明细、封顶标注；叠加番型名优先显示，自摸加底+1不显示。
